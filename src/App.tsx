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

import { JSXElementConstructor, Key, ReactElement, useEffect, useMemo, useState } from "react";
import { useT } from "i18n";

// react-router components
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

// @mui material components
import Icon from "@mui/material/Icon";

// Material Dashboard 2 PRO React TS components
import MDBox from "components/MDBox";

// Material Dashboard 2 PRO React TS exampless
import Configurator from "examples/Configurator";
import Sidenav from "examples/Sidenav";

// Material Dashboard 2 PRO React TS themes

// Material Dashboard 2 PRO React TS Dark Mode themes

// RTL plugins
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import rtlPlugin from "stylis-plugin-rtl";

// Material Dashboard 2 PRO React TS routes
import { createRoutes } from "routes";
import ErrorBoundary from "components/ErrorBoundary";

// Material Dashboard 2 PRO React TS contexts
import { setMiniSidenav, setOpenConfigurator, useMaterialUIController } from "context";

// Images
import tulipfleetLogo from "assets/images/tulipfleet-logo.png";

export default function App() {
  const [controller, dispatch] = useMaterialUIController();
  const { miniSidenav, direction, layout, openConfigurator, sidenavColor } = controller;
  const [onMouseEnter, setOnMouseEnter] = useState(false);
  const [rtlCache, setRtlCache] = useState(null);
  const { pathname } = useLocation();
  const { t } = useT();
  const routes = useMemo(() => createRoutes(t), [t]);

  // Cache for the rtl
  useMemo(() => {
    const pluginRtl: any = rtlPlugin;
    const cacheRtl = createCache({
      key: "rtl",
      stylisPlugins: [pluginRtl],
    });

    setRtlCache(cacheRtl);
  }, []);

  // Open sidenav when mouse enter on mini sidenav
  const handleOnMouseEnter = () => {
    if (miniSidenav && !onMouseEnter) {
      setMiniSidenav(dispatch, false);
      setOnMouseEnter(true);
    }
  };

  // Close sidenav when mouse leave mini sidenav
  const handleOnMouseLeave = () => {
    if (onMouseEnter) {
      setMiniSidenav(dispatch, true);
      setOnMouseEnter(false);
    }
  };

  // Change the openConfigurator state
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);

  // Setting the dir attribute for the body element
  useEffect(() => {
    document.body.setAttribute("dir", direction);
  }, [direction]);

  // Setting page scroll to 0 when changing the route
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
  }, [pathname]);

  const getRoutes = (allRoutes: any[]): any =>
    allRoutes.map(
      (route: {
        collapse: any;
        route: string;
        component: ReactElement<any, string | JSXElementConstructor<any>>;
        key: Key;
      }) => {
        if (route.collapse) {
          return getRoutes(route.collapse);
        }

        if (route.route) {
          return (
            <Route
              path={route.route}
              element={<ErrorBoundary>{route.component}</ErrorBoundary>}
              key={route.key}
            />
          );
        }

        return null;
      }
    );

  const configsButton = (
    <MDBox
      display="flex"
      justifyContent="center"
      alignItems="center"
      width="3.25rem"
      height="3.25rem"
      bgColor="white"
      shadow="sm"
      borderRadius="50%"
      position="fixed"
      right="2rem"
      bottom="2rem"
      zIndex={99}
      color="dark"
      sx={{ cursor: "pointer" }}
      onClick={handleConfiguratorOpen}
    >
      <Icon fontSize="small" color="inherit">
        settings
      </Icon>
    </MDBox>
  );

  return direction === "rtl" ? (
    <CacheProvider value={rtlCache}>
      {/* ThemeProvider removed here — index.tsx provides the global theme */}
      {layout === "dashboard" && (
        <>
          <Sidenav
            color={sidenavColor}
            brand={tulipfleetLogo}
            brandName={t("login.brand")}
            routes={routes}
            onMouseEnter={handleOnMouseEnter}
            onMouseLeave={handleOnMouseLeave}
          />
          <Configurator />
          {configsButton}
        </>
      )}
      {layout === "vr" && <Configurator />}
      <Routes>
        {getRoutes(routes)}
        <Route path="*" element={<Navigate to="/dashboards/live-fleet-map" />} />
      </Routes>
    </CacheProvider>
  ) : (
    <>
      {/* ThemeProvider removed here — index.tsx provides the global theme */}
      {layout === "dashboard" && (
        <>
          <Sidenav
            color={sidenavColor}
            brand={tulipfleetLogo}
            brandName={t("login.brand")}
            routes={routes}
            onMouseEnter={handleOnMouseEnter}
            onMouseLeave={handleOnMouseLeave}
          />
          <Configurator />
          {configsButton}
        </>
      )}
      {layout === "vr" && <Configurator />}
      <Routes>
        {getRoutes(routes)}
        <Route path="*" element={<Navigate to="/dashboards/live-fleet-map" />} />
      </Routes>
    </>
  );
}
