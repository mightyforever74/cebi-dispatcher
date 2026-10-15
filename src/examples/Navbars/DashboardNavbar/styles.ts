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
import { density, landing, shadow } from "assets/theme/tokens";

// D2 "Kabuk" (docs/UI_D2_REPORT.md, Adım 1): 64px sabit yükseklikte, edge-to-edge
// sticky navbar (landing Header paritesi). `glass` token'ı (D1 tokens.ts + global.css
// CSS custom properties) CSS var() referanslarıyla TÜKETİLİR — bu sayede
// `prefers-reduced-transparency: reduce` fallback'i (global.css) JS'e dokunmadan
// otomatik uygulanır.
const NAVBAR_HEIGHT_PX = density.navbar;

function navbar(theme: Theme | any, ownerState: any) {
  const { palette, boxShadows, functions, transitions, breakpoints } = theme;
  // 2026-10-15 (Cem): `transparentNavbar` (scroll-top-of-window toggle,
  // context/index.tsx) deliberately NOT consumed below anymore. Root cause of
  // the "navbar hareket halinde şeffaf" mismatch vs landing: `transparentNavbar`
  // is `window.scrollY===0`-driven, but most dispatcher screens never scroll
  // the window at all (e.g. live-fleet-map locks to 100dvh — LiveFleetMap.tsx:541),
  // so it was PERMANENTLY stuck `true` there -> background/blur/shadow were
  // permanently forced to "none", i.e. the glass styling below was dead code on
  // exactly the screens it mattered most for. A scroll-conditional invisible
  // navbar is also the wrong pattern for an ops dashboard regardless (nav/
  // notifications/account must stay reachable at all times) — landing's hero
  // page and this app are not the same kind of page. Fix: the glass chrome
  // below is now always-on for the non-`absolute` case; `absolute` (the one
  // account/BaseLayout hero usage) keeps its original fully-transparent
  // behavior unchanged.
  const { absolute, light, darkMode } = ownerState;

  const { dark, white, text, transparent } = palette;
  const { navbarBoxShadow } = boxShadows;
  const { rgba: withAlpha, pxToRem } = functions;

  return {
    // `shadow.nav` (tokens.ts, landing-bridged) replaces the MD2 inset-highlight
    // navbarBoxShadow in dark mode only — the floating-glass-panel depth cue
    // landing's header has and this navbar was missing. Light mode keeps the
    // original MD2 shadow (shadow.nav was tuned for landing's dark-only design).
    boxShadow: absolute ? "none" : darkMode ? shadow.nav : navbarBoxShadow,
    backdropFilter:
      absolute
        ? "none"
        : "saturate(var(--tf-glass-saturate, 140%)) blur(var(--tf-glass-blur, 16px))",
    // dark modda navbar artık MD2'nin generic `background.default` paletinden
    // değil, landing'in navy camından besleniyor (`landing.navy` @ 0.7,
    // --tf-navbar-bg-dark CSS var üzerinden — prefers-reduced-transparency
    // fallback'i global.css'te 0.96'ya çıkıyor). Light tema dokunulmadı:
    // landing'de karşılığı yok.
    backgroundColor:
      absolute
        ? `${transparent.main} !important`
        : darkMode
        ? `var(--tf-navbar-bg-dark, ${withAlpha(landing.navy, 0.7)})`
        : withAlpha(white.main, 0.8),
    borderBottom:
      darkMode && !absolute
        ? `${pxToRem(1)} solid var(--tf-navbar-border-dark, rgba(255, 255, 255, 0.1))`
        : "none",

    color: () => {
      if (light) return white.main;
      // Arka plan artık (absolute hariç) her zaman koyu cam — `dark.main`
      // (paletteLight/paletteDark'ta AYNI sabit navy-gri değer) bu zeminde
      // AA kontrastını geçemez. `text.main` tema-duyarlı; her iki temada da
      // zaten okunurdu (önceki transparentNavbar=true dalı buydu).
      if (darkMode) return text.main;
      return dark.main;
    },
    // Landing Header paritesi: floating/rounded kart değil, viewport üstüne
    // hizalanmış düz bir çubuk (top:0, borderRadius:0, minHeight: 64px).
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

// D2 "Kabuk" (docs/UI_D2_REPORT.md, Adım 1): mobilde de navbar TEK SATIR kalmalı
// ("navbar içeriği tek satırda kalır"). Önceki MD2 şablonu <md genişlikte
// `flexDirection: column` kullanıyordu — bu, breadcrumb+başlık satırının ikinci
// bir satıra (arama kutusu + ikonlar) düşmesine, dolayısıyla navbar'ın 2-3
// satıra bölünmesine yol açıyordu (bkz. 390px mobil ekran görüntüsü, D0/D1
// döneminden kalma bozukluk). Artık HER genişlikte `row` — taşan öğe (arama
// kutusu) `index.tsx`'te <sm gizleniyor, kalanlar (dil/tema/hesap/hamburger/
// ayarlar/bildirim ikonları) tek satıra sığıyor.
const navbarContainer = (): any => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "nowrap",
  pt: 0,
  pb: 0,
});

// D2 Adım 1: navbarContainer artık her genişlikte `row` (bkz. yukarısı) — bu
// yüzden iki alt kutu (sol: breadcrumb/başlık, sağ: dil/tema/hesap/ikonlar)
// AYNI satırda yan yana sığmalı. Sol kutu daralabilir (flex-shrink + minWidth:0
// + overflow:hidden, başlık zaten `noWrap` — bkz. Breadcrumbs/index.tsx), sağ
// kutu asla küçülmez (flex-shrink: 0) — ikonlar hiçbir genişlikte kırpılmaz.
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
