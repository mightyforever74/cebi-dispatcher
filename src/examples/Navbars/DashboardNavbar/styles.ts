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
import { density } from "assets/theme/tokens";

// D2 "Kabuk" (docs/UI_D2_REPORT.md, Adim 1): 64px sabit yukseklikte, edge-to-edge
// sticky navbar (landing Header paritesi). `glass` token'i (D1 tokens.ts + global.css
// CSS custom properties) CSS var() referanslariyla TUKETILIR — bu sayede
// `prefers-reduced-transparency: reduce` fallback'i (global.css) JS'e dokunmadan
// otomatik uygulanir.
const NAVBAR_HEIGHT_PX = density.navbar;

function navbar(theme: Theme | any, ownerState: any) {
  const { palette, boxShadows, functions, transitions, breakpoints } = theme;
  const { transparentNavbar, absolute, light, darkMode } = ownerState;

  const { dark, white, text, transparent, background } = palette;
  const { navbarBoxShadow } = boxShadows;
  const { rgba: withAlpha, pxToRem } = functions;

  return {
    boxShadow: transparentNavbar || absolute ? "none" : navbarBoxShadow,
    backdropFilter:
      transparentNavbar || absolute
        ? "none"
        : "saturate(var(--tf-glass-saturate, 140%)) blur(var(--tf-glass-blur, 16px))",
    backgroundColor:
      transparentNavbar || absolute
        ? `${transparent.main} !important`
        : withAlpha(darkMode ? background.default : white.main, 0.8),

    color: () => {
      let color;

      if (light) {
        color = white.main;
      } else if (transparentNavbar) {
        color = text.main;
      } else {
        color = dark.main;
      }

      return color;
    },
    // Landing Header paritesi: floating/rounded kart degil, viewport ustune
    // hizalanmis duz bir cubuk (top:0, borderRadius:0, minHeight: 64px).
    top: 0,
    minHeight: pxToRem(NAVBAR_HEIGHT_PX),
    display: "grid",
    alignItems: "center",
    borderRadius: absolute ? 0 : 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingRight: absolute ? pxToRem(8) : 0,
    paddingLeft: absolute ? pxToRem(16) : 0,

    "& > *": {
      transition: transitions.create("all", {
        easing: transitions.easing.easeInOut,
        duration: transitions.duration.standard,
      }),
    },

    "& .MuiToolbar-root": {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: pxToRem(NAVBAR_HEIGHT_PX),

      [breakpoints.up("sm")]: {
        minHeight: pxToRem(NAVBAR_HEIGHT_PX),
        padding: `0 ${pxToRem(16)}`,
      },
    },
  };
}

// D2 "Kabuk" (docs/UI_D2_REPORT.md, Adim 1): mobilde de navbar TEK SATIR kalmali
// ("navbar icerigi tek satirda kalir"). Onceki MD2 sablonu <md genislikte
// `flexDirection: column` kullaniyordu — bu, breadcrumb+baslik satirinin ikinci
// bir satira (arama kutusu + ikonlar) dusmesine, dolayisiyla navbar'in 2-3
// satira bolunmesine yol aciyordu (bkz. 390px mobil ekran goruntusu, D0/D1
// doneminden kalma bozukluk). Artik HER genislikte `row` — tasan oge (arama
// kutusu) `index.tsx`'te <sm gizleniyor, kalanlar (dil/tema/hesap/hamburger/
// ayarlar/bildirim ikonlari) tek satira sigiyor.
const navbarContainer = (): any => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "nowrap",
  pt: 0,
  pb: 0,
});

// D2 Adim 1: navbarContainer artik her genislikte `row` (bkz. yukarisi) — bu
// yuzden iki alt kutu (sol: breadcrumb/baslik, sag: dil/tema/hesap/ikonlar)
// AYNI satirda yan yana sigmali. Sol kutu daralabilir (flex-shrink + minWidth:0
// + overflow:hidden, baslik zaten `noWrap` — bkz. Breadcrumbs/index.tsx), sag
// kutu asla kuculmez (flex-shrink: 0) — ikonlar hicbir genislikte kirpilmaz.
const navbarRow = ({ breakpoints }: Theme, { isMini, variant }: any) => {
  if (variant === "end") {
    return {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      flex: "0 0 auto",
      width: "auto",

      [breakpoints.up("xl")]: {
        justifyContent: isMini ? "flex-end" : "stretch !important",
        width: isMini ? "auto" : "max-content !important",
      },
    };
  }

  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flex: "1 1 auto",
    minWidth: 0,
    overflow: "hidden",
  };
};

const navbarIconButton = ({ typography: { size }, breakpoints }: Theme) => ({
  px: 1,

  "& .material-icons, .material-icons-round": {
    fontSize: `${size.xl} !important`,
  },

  "& .MuiTypography-root": {
    display: "none",

    [breakpoints.up("sm")]: {
      display: "inline-block",
      lineHeight: 1.2,
      ml: 0.5,
    },
  },
});

const navbarDesktopMenu = ({ breakpoints }: Theme) => ({
  display: "none !important",
  cursor: "pointer",

  [breakpoints.up("xl")]: {
    display: "inline-block !important",
  },
});

const navbarMobileMenu = ({ breakpoints }: Theme) => ({
  display: "inline-block",
  lineHeight: 0,

  [breakpoints.up("xl")]: {
    display: "none",
  },
});

export {
  navbar,
  navbarContainer,
  navbarRow,
  navbarIconButton,
  navbarDesktopMenu,
  navbarMobileMenu,
};
