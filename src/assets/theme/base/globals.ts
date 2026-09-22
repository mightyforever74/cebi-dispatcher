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

// Material Dashboard 2 PRO React TS Base Styles
import colors from "assets/theme/base/colors";

const { info, dark } = colors;

const globals = {
  html: {
    scrollBehavior: "smooth",
  },
  // D1 "Tema Koprusu" (docs/UI_D1_REPORT.md, Adim 3.3): tum sayisal/telemetri
  // metinleri (plaka, ETA, mesafe, tarih) tabular-nums ile hizali genislikte
  // render edilsin. `body` seviyesinde tanimlanir ve inheritance ile TUM
  // metin dugumlerine yayilir — rakam ICERMEYEN metinlerde gorsel etkisi
  // SIFIRDIR (font-variant-numeric yalnizca 0-9 karakterlerini etkiler).
  body: {
    fontVariantNumeric: "tabular-nums",
  },
  "*, *::before, *::after": {
    margin: 0,
    padding: 0,
  },
  "a, a:link, a:visited": {
    textDecoration: "none !important",
  },
  "a.link, .link, a.link:link, .link:link, a.link:visited, .link:visited": {
    color: `${dark.main} !important`,
    transition: "color 150ms ease-in !important",
  },
  "a.link:hover, .link:hover, a.link:focus, .link:focus": {
    color: `${info.main} !important`,
  },
};

export default globals;
