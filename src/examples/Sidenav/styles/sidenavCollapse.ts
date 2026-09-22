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
import { Theme } from "@mui/material/styles";

// D2 "Kabuk" (docs/UI_D2_REPORT.md, Adım 2): varsayılan (dark) sidenav artık
// jenerik `palette[color].main` dolgu yerine landing köprüsü `emerald` şerit +
// `offwhite`/`navyFog` metin renklerini kullanıyor — tek kaynak `tokens.ts`.
import { landing } from "assets/theme/tokens";

function collapseItem(theme: Theme, ownerState: any) {
  const { palette, transitions, breakpoints, borders, functions } = theme;
  const { active, transparentSidenav, whiteSidenav, darkMode } = ownerState;

  const { white, transparent, dark, grey } = palette;
  const { borderRadius } = borders;
  const { rgba: withAlpha, pxToRem } = functions;

  return {
    background: () => {
      let backgroundValue;

      if (transparentSidenav && darkMode) {
        backgroundValue = active ? withAlpha(white.main, 0.2) : transparent.main;
      } else if (transparentSidenav && !darkMode) {
        backgroundValue = active ? grey[300] : transparent.main;
      } else if (whiteSidenav) {
        backgroundValue = active ? grey[200] : transparent.main;
      } else {
        // Varsayılan (dark) sidenav: emerald şerit + düşük opaklı dolgu.
        backgroundValue = active ? withAlpha(landing.emerald, 0.16) : transparent.main;
      }

      return backgroundValue;
    },
    color: (transparentSidenav && !darkMode) || whiteSidenav ? dark.main : landing.offwhite,
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: `${pxToRem(8)} ${pxToRem(16)}`,
    margin: `${pxToRem(1.5)} ${pxToRem(16)}`,
    borderRadius: borderRadius.md,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    borderLeft:
      active && !whiteSidenav && !transparentSidenav
        ? `3px solid ${landing.emerald}`
        : "3px solid transparent",
    boxShadow: "none",
    [breakpoints.up("xl")]: {
      transition: transitions.create(["box-shadow", "background-color", "border-color"], {
        easing: transitions.easing.easeInOut,
        duration: transitions.duration.shorter,
      }),
    },

    "&:hover, &:focus": {
      backgroundColor:
        transparentSidenav && !darkMode
          ? grey[300]
          : whiteSidenav
          ? withAlpha(grey[400], 0.2)
          : withAlpha(landing.emerald, 0.1),
    },
  };
}

function collapseIconBox(theme: Theme, ownerState: any) {
  const { palette, transitions, borders, functions } = theme;
  const { transparentSidenav, whiteSidenav, darkMode, active } = ownerState;

  const { dark } = palette;
  const { borderRadius } = borders;
  const { pxToRem } = functions;

  const defaultColor = active ? landing.emerald : landing.navyFog;

  return {
    minWidth: pxToRem(32),
    minHeight: pxToRem(32),
    color: (transparentSidenav && !darkMode) || whiteSidenav ? dark.main : defaultColor,
    borderRadius: borderRadius.md,
    display: "grid",
    placeItems: "center",
    transition: transitions.create(["margin", "color"], {
      easing: transitions.easing.easeInOut,
      duration: transitions.duration.standard,
    }),

    "& svg, svg g": {
      color: transparentSidenav || whiteSidenav ? dark.main : defaultColor,
    },
  };
}

const collapseIcon = (theme: Theme, { active }: any) => ({
  color: active ? landing.emerald : landing.navyFog,
});

function collapseText(theme: any, ownerState: any) {
  const { typography, transitions, breakpoints, functions } = theme;
  const { miniSidenav, transparentSidenav, whiteSidenav, active, darkMode } = ownerState;

  const { size, fontWeightRegular, fontWeightLight } = typography;
  const { pxToRem } = functions;
  const { palette } = theme as Theme;
  const { dark } = palette as any;

  return {
    marginLeft: pxToRem(10),
    flex: "1 1 auto",
    minWidth: 0,
    overflow: "hidden",

    [breakpoints.up("xl")]: {
      opacity: miniSidenav || (miniSidenav && transparentSidenav) ? 0 : 1,
      maxWidth: miniSidenav || (miniSidenav && transparentSidenav) ? 0 : "100%",
      marginLeft: miniSidenav || (miniSidenav && transparentSidenav) ? 0 : pxToRem(10),
      transition: transitions.create(["opacity", "margin"], {
        easing: transitions.easing.easeInOut,
        duration: transitions.duration.standard,
      }),
    },

    "& span": {
      color:
        (transparentSidenav && !darkMode) || whiteSidenav
          ? dark.main
          : active
          ? landing.offwhite
          : landing.navyFog,
      fontWeight: active ? fontWeightRegular : fontWeightLight,
      fontSize: size.sm,
      lineHeight: 1.5,
      display: "block",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      transition: transitions.create("color", {
        easing: transitions.easing.easeInOut,
        duration: transitions.duration.standard,
      }),
    },
  };
}

function collapseArrow(theme: Theme, ownerState: any) {
  const { palette, typography, transitions, breakpoints, functions } = theme;
  const { noCollapse, transparentSidenav, whiteSidenav, miniSidenav, open, active, darkMode } =
    ownerState;

  const { white, dark } = palette;
  const { size } = typography;
  const { pxToRem, rgba: withAlpha } = functions;

  return {
    fontSize: `${size.lg} !important`,
    fontWeight: 700,
    marginBottom: pxToRem(-1),
    transform: open ? "rotate(0)" : "rotate(-180deg)",
    color: () => {
      let colorValue;

      if (transparentSidenav && darkMode) {
        colorValue = open || active ? white.main : withAlpha(white.main, 0.25);
      } else if (transparentSidenav || whiteSidenav) {
        colorValue = open || active ? dark.main : withAlpha(dark.main, 0.25);
      } else {
        colorValue = open || active ? white.main : withAlpha(white.main, 0.5);
      }

      return colorValue;
    },
    transition: transitions.create(["color", "transform", "opacity"], {
      easing: transitions.easing.easeInOut,
      duration: transitions.duration.shorter,
    }),

    [breakpoints.up("xl")]: {
      display:
        noCollapse || (transparentSidenav && miniSidenav) || miniSidenav
          ? "none !important"
          : "block !important",
    },
  };
}

export { collapseItem, collapseIconBox, collapseIcon, collapseText, collapseArrow };
