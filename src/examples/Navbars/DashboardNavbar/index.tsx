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

// Declaring prop types for DashboardNavbar
interface Props {
  absolute?: boolean;
  light?: boolean;
  isMini?: boolean;
}

function DashboardNavbar({ absolute, light, isMini }: Props): JSX.Element {
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

  // ── TulipFleet Anlik Sicak Uyari Istasyonu ─────────────────────────────
  // Bu bir e-posta kutusu DEGIL: sadece kritik operasyonel olaylarin listesi.
  // Tiklaninca (a) o uyari "okundu" sayilir (badge sayisi duser) ve
  // (b) mailto: ile varsayilan mail programi onceden doldurulmus taslakla acilir.
  //
  // ONEMLI - DOGRULANMIS DURUM (2026-07-02, backend arastirmasi):
  // tulipfleet-backend ve tulipfleet-enterprise-backend repolarinda
  // confirmation_email / notification_email / mail_client / notification_prefs
  // gibi hicbir DB kolonu/route YOK. Bu liste ve Settings > EmailIntegration
  // formu su an tamamen MOCK/frontend-only calisir, hicbir yere persist etmez.
  // Gercek zamanli (WSS/SSE) tetikleme de backend'de kurulu degil - bu component
  // bir prototip/UI iskeleti, canli veri kaynagi ayri bir is (bkz. ADR backlog).
  const notificationEmail = "dispatcher@tulipfleet.nl";

  interface AlertNotification {
    id: string;
    icon: string;
    iconColor: "warning" | "error" | "secondary" | "info" | "success";
    title: string;
    mailtoSubject: string;
    mailtoBody: string;
    read: boolean;
  }

  const [notifications, setNotifications] = useState<AlertNotification[]>([
    {
      id: "1",
      icon: "eco",
      iconColor: "warning",
      title: "AH-05-KL: ZE-Zone ihlali (Amsterdam)",
      mailtoSubject: "ZE-Zone Ihlali - AH-05-KL",
      mailtoBody:
        "Arac AH-05-KL, Amsterdam Sifir Emisyon (ZE) bolgesinde ihlal tespit edildi. Lutfen inceleyin.",
      read: false,
    },
    {
      id: "2",
      icon: "assignment_late",
      iconColor: "error",
      title: "RD-NL-78: Sevk onayi gecikti (10 dk)",
      mailtoSubject: "Sevk Onayi Gecikti - RD-NL-78",
      mailtoBody: "RD-NL-78 plakali aracin surucusu, atanan gorevi 10 dakika icinde onaylamadi.",
      read: false,
    },
    {
      id: "3",
      icon: "signal_wifi_off",
      iconColor: "secondary",
      title: "BX-TR-42: Telemetri baglantisi koptu",
      mailtoSubject: "Telemetri Baglantisi Koptu - BX-TR-42",
      mailtoBody:
        "BX-TR-42 plakali aractan telemetri verisi alinamiyor. Cihaz durumunu kontrol edin.",
      read: false,
    },
    {
      id: "4",
      icon: "eco",
      iconColor: "warning",
      title: "NL-92-VB: ZE-Zone ihlali (Rotterdam)",
      mailtoSubject: "ZE-Zone Ihlali - NL-92-VB",
      mailtoBody:
        "Arac NL-92-VB, Rotterdam Sifir Emisyon (ZE) bolgesinde ihlal tespit edildi. Lutfen inceleyin.",
      read: false,
    },
    {
      id: "5",
      icon: "battery_alert",
      iconColor: "error",
      title: "AH-05-KL: Dusuk yakit seviyesi (%8)",
      mailtoSubject: "Dusuk Yakit Seviyesi - AH-05-KL",
      mailtoBody: "AH-05-KL plakali aracin yakit seviyesi kritik esigin (%10) altina dustu.",
      read: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const buildMailto = (subject: string, body: string) =>
    `mailto:${notificationEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      body
    )}`;

  const handleAlertClick = (id: string) => () => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  // Render the notifications menu ("Anlik Sicak Uyari Istasyonu")
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
          🔥 Anlik Sicak Uyari Istasyonu
        </MDTypography>
        <MDTypography variant="caption" color="text" display="block">
          Tiklayinca ilgili mail programiniz acilir
        </MDTypography>
      </MDBox>
      <Divider sx={{ my: 0.5 }} />

      <MDBox sx={{ maxHeight: 260, overflowY: "auto" }}>
        {notifications.map((n) => (
          <NotificationItem
            key={n.id}
            icon={
              <Icon color={n.iconColor} fontSize="small">
                {n.icon}
              </Icon>
            }
            title={n.title}
            component="a"
            href={buildMailto(n.mailtoSubject, n.mailtoBody)}
            onClick={handleAlertClick(n.id)}
            sx={{ opacity: n.read ? 0.5 : 1 }}
          />
        ))}
      </MDBox>

      <Divider sx={{ my: 0.5 }} />
      <NotificationItem
        icon={
          <Icon color="info" fontSize="small">
            settings
          </Icon>
        }
        title="Posta Kutusu Ayarlarini Duzenle"
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
              <MDInput label="Search here" />
            </MDBox>
            <MDBox color={light ? "white" : "inherit"}>
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
