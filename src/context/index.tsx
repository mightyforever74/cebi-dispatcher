/* eslint-disable no-unused-vars */

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

/**
  This file is used for controlling the global states of the components,
  you can customize the states for the different components here.
*/

import { createContext, ReactNode, useContext, useMemo, useReducer } from "react";

// The Material Dashboard 2 PRO React TSUI Dashboard PRO Material main context
const MaterialUI = createContext<any>(null);

/**
 * D1 "Tema Köprüsü" (docs/UI_D1_REPORT.md, Adım 1): tema tercihi için
 * localStorage anahtarı. `public/index.html`'deki FOUC-önleyici inline
 * script ve `examples/Configurator/index.tsx`'teki switch ile BİREBİR
 * aynı tutulmalıdır.
 */
export const THEME_STORAGE_KEY = "tf.theme";

/** İlk `darkMode` değerini localStorage → `prefers-color-scheme` sırasıyla
 * çözer. SSR/test ortamlarında `window` yoksa güvenli varsayılan (dark) döner. */
function resolveInitialDarkMode(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark") return true;
    if (stored === "light") return false;
  } catch {
    // localStorage erişilemez (gizli sekme/kota) — sistem tercihine düş.
  }
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : true;
}

// Setting custom name for the context which is visible on react dev tools
MaterialUI.displayName = "MaterialUIContext";

// types
interface StateTypes {
  miniSidenav: boolean;
  transparentSidenav: boolean;
  whiteSidenav: boolean;
  sidenavColor:
    | "primary"
    | "secondary"
    | "info"
    | "success"
    | "warning"
    | "error"
    | "light"
    | "dark";
  transparentNavbar: boolean;
  fixedNavbar: boolean;
  openConfigurator: boolean;
  direction: "ltr" | "rtl";
  layout: "dashboard" | "page";
  darkMode: boolean;
}

interface ActionTypes {
  type:
    | "MINI_SIDENAV"
    | "TRANSPARENT_SIDENAV"
    | "WHITE_SIDENAV"
    | "SIDENAV_COLOR"
    | "TRANSPARENT_NAVBAR"
    | "FIXED_NAVBAR"
    | "OPEN_CONFIGURATOR"
    | "DIRECTION"
    | "LAYOUT"
    | "DARKMODE";
  value: any;
}

// Material Dashboard 2 PRO React reducer
// D2-fix: same-value dispatch must return the *same* state object.
// Sidenav resize + navbar scroll + DashboardLayout pathname effects all
// dispatch on every navigation; `{ ...state }` without this bailout forces
// every context consumer (Vehicles DataTable included) to re-render and can
// close a Maximum update depth loop (React #185).
function reducer(state: StateTypes, action: ActionTypes) {
  switch (action.type) {
    case "MINI_SIDENAV": {
      if (state.miniSidenav === action.value) return state;
      return { ...state, miniSidenav: action.value };
    }
    case "TRANSPARENT_SIDENAV": {
      if (state.transparentSidenav === action.value) return state;
      return { ...state, transparentSidenav: action.value };
    }
    case "WHITE_SIDENAV": {
      if (state.whiteSidenav === action.value) return state;
      return { ...state, whiteSidenav: action.value };
    }
    case "SIDENAV_COLOR": {
      if (state.sidenavColor === action.value) return state;
      return { ...state, sidenavColor: action.value };
    }
    case "TRANSPARENT_NAVBAR": {
      if (state.transparentNavbar === action.value) return state;
      return { ...state, transparentNavbar: action.value };
    }
    case "FIXED_NAVBAR": {
      if (state.fixedNavbar === action.value) return state;
      return { ...state, fixedNavbar: action.value };
    }
    case "OPEN_CONFIGURATOR": {
      if (state.openConfigurator === action.value) return state;
      return { ...state, openConfigurator: action.value };
    }
    case "DIRECTION": {
      if (state.direction === action.value) return state;
      return { ...state, direction: action.value };
    }
    case "LAYOUT": {
      if (state.layout === action.value) return state;
      return { ...state, layout: action.value };
    }
    case "DARKMODE": {
      if (state.darkMode === action.value) return state;
      return { ...state, darkMode: action.value };
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
}

// Material Dashboard 2 PRO React context provider
function MaterialUIControllerProvider({ children }: { children: ReactNode }): JSX.Element {
  const initialState: StateTypes = {
    miniSidenav: false,
    transparentSidenav: false,
    whiteSidenav: false,
    sidenavColor: "info",
    transparentNavbar: true,
    fixedNavbar: true,
    openConfigurator: false,
    direction: "ltr",
    layout: "dashboard",
    darkMode: resolveInitialDarkMode(),
  };

  const [controller, dispatch] = useReducer(reducer, initialState);

  const value = useMemo(() => [controller, dispatch], [controller, dispatch]);

  return <MaterialUI.Provider value={value}>{children}</MaterialUI.Provider>;
}

// Material Dashboard 2 PRO React custom hook for using context
function useMaterialUIController() {
  const context = useContext(MaterialUI);

  if (!context) {
    throw new Error(
      "useMaterialUIController should be used inside the MaterialUIControllerProvider."
    );
  }

  return context;
}

// Context module functions
const setMiniSidenav = (
  dispatch: (arg: { type: "MINI_SIDENAV"; value: boolean }) => void,
  value: boolean
) => dispatch({ type: "MINI_SIDENAV", value });
const setTransparentSidenav = (
  dispatch: (arg: { type: "TRANSPARENT_SIDENAV"; value: boolean }) => void,
  value: boolean
) => dispatch({ type: "TRANSPARENT_SIDENAV", value });
const setWhiteSidenav = (
  dispatch: (arg: { type: "WHITE_SIDENAV"; value: boolean }) => void,
  value: boolean
) => dispatch({ type: "WHITE_SIDENAV", value });
const setSidenavColor = (
  dispatch: (arg: {
    type: "SIDENAV_COLOR";
    value: "primary" | "secondary" | "info" | "success" | "warning" | "error" | "light" | "dark";
  }) => void,
  value: "primary" | "secondary" | "info" | "success" | "warning" | "error" | "light" | "dark"
) => dispatch({ type: "SIDENAV_COLOR", value });
const setTransparentNavbar = (
  dispatch: (arg: { type: "TRANSPARENT_NAVBAR"; value: boolean }) => void,
  value: boolean
) => dispatch({ type: "TRANSPARENT_NAVBAR", value });
const setFixedNavbar = (
  dispatch: (arg: { type: "FIXED_NAVBAR"; value: boolean }) => void,
  value: boolean
) => dispatch({ type: "FIXED_NAVBAR", value });
const setOpenConfigurator = (
  dispatch: (arg: { type: "OPEN_CONFIGURATOR"; value: boolean }) => void,
  value: boolean
) => dispatch({ type: "OPEN_CONFIGURATOR", value });
const setDirection = (
  dispatch: (arg: { type: "DIRECTION"; value: "ltr" | "rtl" }) => void,
  value: "ltr" | "rtl"
) => dispatch({ type: "DIRECTION", value });
const setLayout = (
  dispatch: (arg: { type: "LAYOUT"; value: "dashboard" | "page" }) => void,
  value: "dashboard" | "page"
) => dispatch({ type: "LAYOUT", value });
const setDarkMode = (
  dispatch: (arg: { type: "DARKMODE"; value: boolean }) => void,
  value: boolean
) => dispatch({ type: "DARKMODE", value });

export {
  MaterialUIControllerProvider,
  useMaterialUIController,
  setMiniSidenav,
  setTransparentSidenav,
  setWhiteSidenav,
  setSidenavColor,
  setTransparentNavbar,
  setFixedNavbar,
  setOpenConfigurator,
  setDirection,
  setLayout,
  setDarkMode,
};
