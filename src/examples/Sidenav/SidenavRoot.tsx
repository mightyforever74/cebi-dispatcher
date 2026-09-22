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

// @mui material components
import Drawer from "@mui/material/Drawer";
import { styled, Theme } from "@mui/material/styles";

// D2 "Kabuk" (docs/UI_D2_REPORT.md, Adim 2): sidenav yuzeyi artik MD2'nin
// jenerik `background.sidenav`/`gradients.dark` degerleri yerine landing
// koprusu `navyInk` token'indan besleniyor — tek kaynak `tokens.ts`.
import { landing } from "assets/theme/tokens";

export default styled(Drawer)(({ theme, ownerState }: { theme?: Theme | any; ownerState: any }) => {
  const { palette, boxShadows, transitions, breakpoints, functions } = theme;
  const { transparentSidenav, whiteSidenav, miniSidenav, darkMode } = ownerState;

  const sidebarWidth = 250;
  const { transparent, white } = palette;
  const { xxl } = boxShadows;
  const { pxToRem, rgba: withAlpha } = functions;

  // Sidenav her iki MUI tema modunda da (light/dark) markaya sabit koyu-lacivert
  // (navyInk) yuzey — bu davranis D1 oncesinde de zaten boyleydi (bkz.
  // docs/UI_D0_DISCOVERY.md), yalnizca tam hex degeri artik tokens.ts'ten.
  let backgroundValue = withAlpha(landing.navyInk, darkMode ? 0.92 : 1);

  if (transparentSidenav) {
    backgroundValue = transparent.main;
  } else if (whiteSidenav) {
    backgroundValue = white.main;
  }

  // styles for the sidenav when miniSidenav={false}
  const drawerOpenStyles = () => ({
    background: backgroundValue,
    transform: "translateX(0)",
    transition: transitions.create("transform", {
      easing: transitions.easing.sharp,
      duration: transitions.duration.shorter,
    }),

    [breakpoints.up("xl")]: {
      boxShadow: transparentSidenav ? "none" : xxl,
      marginBottom: transparentSidenav ? 0 : "inherit",
      left: "0",
      width: sidebarWidth,
      transform: "translateX(0)",
      transition: transitions.create(["width", "background-color"], {
        easing: transitions.easing.sharp,
        duration: transitions.duration.enteringScreen,
      }),
    },
  });

  // styles for the sidenav when miniSidenav={true}
  const drawerCloseStyles = () => ({
    background: backgroundValue,
    transform: `translateX(${pxToRem(-320)})`,
    transition: transitions.create("transform", {
      easing: transitions.easing.sharp,
      duration: transitions.duration.shorter,
    }),

    [breakpoints.up("xl")]: {
      boxShadow: transparentSidenav ? "none" : xxl,
      marginBottom: transparentSidenav ? 0 : "inherit",
      left: "0",
      width: pxToRem(96),
      overflowX: "hidden",
      transform: "translateX(0)",
      transition: transitions.create(["width", "background-color"], {
        easing: transitions.easing.sharp,
        duration: transitions.duration.shorter,
      }),
    },
  });

  return {
    "& .MuiDrawer-paper": {
      boxShadow: xxl,
      border: "none",
      backdropFilter:
        darkMode && !transparentSidenav && !whiteSidenav
          ? "saturate(var(--tf-glass-saturate, 140%)) blur(var(--tf-glass-blur, 18px))"
          : "none",

      ...(miniSidenav ? drawerCloseStyles() : drawerOpenStyles()),
    },
  };
});
