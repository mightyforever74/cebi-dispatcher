/**
=========================================================
* TulipFleet Dispatcher — Material Dashboard 3 (PRO React TS, MD2 merged)
=========================================================
* Zero-Touch Core: stock Sidenav bileşenlerine dokunulmadı.
* UI/UX (gated badge hissi, AI vurgusu, demo pasifleştirme) tamamen
* routes.tsx içinde isim + emoji + ikon aksanı ile çözüldü.
* Sidenav: dark (transparentSidenav=false, whiteSidenav=false), sidenavColor=info.
=========================================================
*/

// D7-3 (2) (15 Eki 2026): route-level code splitting. Önceden bu 13 layout
// statik import'tu → tek bundle, Leaflet (yalnız LiveFleetMap kullanıyor,
// bkz. grep "leaflet" src/) her sayfada indiriliyordu (Lighthouse "reduce
// unused JavaScript" 119 KiB). `lazy()` ile her biri kendi webpack chunk'ına
// ayrıldı; Suspense boundary'si App.tsx:getRoutes() içinde (tek yerden tüm
// route'ları kapsar). ForgotPassword/SignInBasic BİLİNÇLİ OLARAK statik
// kaldı: index.tsx bunları AYRICA (auth-gate, App mount'undan önce) statik
// import ediyor — burada lazy yapmak hiçbir şeyi bölmez, webpack ikisini de
// zaten ana chunk'a koyar (index.tsx'teki statik import yüzünden); üstelik
// bu iki sayfa zaten küçük, Lighthouse bulgusunun kaynağı değil.
import { lazy } from "react";

// Bilinçli olarak statik (yukarıdaki not) — index.tsx auth-gate ile paylaşılıyor.
import ForgotPassword from "layouts/authentication/forgot-password";
import SignInBasic from "layouts/authentication/sign-in/basic";

// ── icons ──
import Icon from "@mui/material/Icon";
import type { TFunction } from "i18n";

// ── Dispatcher — canlı operasyonel ekranlar ──
const Drivers = lazy(() => import("layouts/dispatcher/drivers"));
const Tasks = lazy(() => import("layouts/dispatcher/tasks"));
const OptimizeTask = lazy(() => import("layouts/dispatcher/tasks/optimize"));
const Exceptions = lazy(() => import("layouts/dispatcher/exceptions"));
const Vehicles = lazy(() => import("layouts/dispatcher/vehicles"));
const LiveFleetMap = lazy(() => import("layouts/live-fleet-map/LiveFleetMap"));

// ── Optimizasyon — gated placeholder'lar (FEAT-001 / FEAT-008) ──
const TollAnalytics = lazy(() => import("layouts/optimization/TollAnalytics"));
const TourPlanningPlaceholder = lazy(
  () => import("layouts/optimization/TourPlanningPlaceholder")
);

// ── Sistem ──
const Settings = lazy(() => import("layouts/pages/account/settings"));

// FEAT-SaaS S3 (05.08) — Sayfa 1
const SubscriptionPage = lazy(() => import("layouts/subscription"));
const B2bApiPage = lazy(() => import("layouts/subscription/b2bApi"));
// FEAT-SaaS S4 (05.08) — Supervizor ikilisi (D-S2 gate ile korunur)
const SupervisorPage = lazy(() => import("layouts/supervisor"));
const CustomerDetailPage = lazy(() => import("layouts/supervisor/customerDetail"));

export function createRoutes(t: TFunction) {
  return [
  // ═══════════ GRUP 1 — OPERASYON MERKEZİ ═══════════
  { type: "title", title: t("nav.operationsCenter"), key: "title-operations" },
  {
    type: "collapse",
    name: t("nav.liveFleet"),
    key: "live-fleet-map",
    icon: <Icon fontSize="medium">map</Icon>,
    route: "/dashboards/live-fleet-map",
    component: <LiveFleetMap />,
    noCollapse: true,
  },
  {
    type: "collapse",
    name: t("nav.tasksDispatch"),
    key: "task-list",
    icon: <Icon fontSize="medium">assignment</Icon>,
    route: "/dispatcher/tasks",
    component: <Tasks />,
    noCollapse: true,
  },
  // Sidenav'da GORUNMEZ (type/name/icon yok) - /dispatcher/tasks sayfasindaki
  // "Yeni Gorev Olustur" butonundan erisilir. App.tsx getRoutes() sadece
  // route+component alanlarina bakar, type alanini kontrol etmez.
  {
    key: "task-optimize",
    route: "/dispatcher/tasks/optimize",
    component: <OptimizeTask />,
  },
  {
    type: "collapse",
    name: t("nav.exceptions"),
    key: "exceptions",
    icon: (
      <Icon fontSize="medium" color="error">
        warning
      </Icon>
    ),
    route: "/dispatcher/exceptions",
    component: <Exceptions />,
    noCollapse: true,
  },

  // ═══════════ GRUP 2 — YAPAY ZEKÂ & OPTİMİZASYON (gated) ═══════════
  { type: "title", title: t("nav.aiOptimization"), key: "title-optimization" },
  {
    type: "collapse",
    name: t("nav.smartRoute"),
    key: "tour-planning",
    icon: (
      <Icon fontSize="medium" color="info">
        insights
      </Icon>
    ),
    route: "/optimization/tour-planning",
    component: <TourPlanningPlaceholder />,
    noCollapse: true,
  },
  {
    type: "collapse",
    name: t("nav.costToll"),
    key: "toll-analytics",
    icon: (
      <Icon fontSize="medium" color="warning">
        euro_symbol
      </Icon>
    ),
    route: "/optimization/toll-analytics",
    component: <TollAnalytics />,
    noCollapse: true,
  },

  // ═══════════ GRUP 3 — MATRİS & MASTER DATA ═══════════
  { type: "title", title: t("nav.matrixMaster"), key: "title-masterdata" },
  {
    type: "collapse",
    name: t("nav.driverManagement"),
    key: "driver-list",
    icon: <Icon fontSize="medium">people</Icon>,
    route: "/dispatcher/drivers",
    component: <Drivers />,
    noCollapse: true,
  },
  {
    type: "collapse",
    name: t("nav.vehicleEquipment"),
    key: "vehicle-list",
    icon: <Icon fontSize="medium">local_shipping</Icon>,
    route: "/dispatcher/vehicles",
    component: <Vehicles />,
    noCollapse: true,
  },

  // ═══════════ GRUP 4 — SİSTEM ═══════════
  { type: "divider", key: "divider-system" },
  { type: "title", title: t("nav.system"), key: "title-system" },
  {
    type: "collapse",
    name: t("nav.tenantSettings"),
    key: "system-settings",
    icon: <Icon fontSize="medium">settings</Icon>,
    route: "/system/settings",
    component: <Settings />,
    noCollapse: true,
  },

  // ═══════════ GRUP 5 — YÖNETİM ═══════════
  { type: "title", title: t("nav.administration"), key: "title-management" },
  {
    type: "collapse",
    name: t("nav.subscription"),
    key: "subscription",
    icon: <Icon fontSize="medium">card_membership</Icon>,
    route: "/subscription",
    component: <SubscriptionPage />,
    noCollapse: true,
  },
  {
    key: "subscription-b2b-api",
    route: "/subscription/b2b-api",
    component: <B2bApiPage />,
  },
  {
    type: "collapse",
    name: t("nav.supervisor"),
    key: "supervisor",
    icon: <Icon fontSize="medium">admin_panel_settings</Icon>,
    route: "/admin/supervisor",
    component: <SupervisorPage />,
    noCollapse: true,
  },
  {
    key: "supervisor-customer-detail",
    route: "/admin/supervisor/customer-detail",
    component: <CustomerDetailPage />,
  },
  // Sidenav'da GORUNMEZ — login "Şifremi unuttum" / AuthGate.
  {
    type: "route",
    key: "forgot-password",
    route: "/authentication/forgot-password",
    component: <ForgotPassword />,
  },
  {
    type: "route",
    key: "sign-in-basic",
    route: "/authentication/sign-in/basic",
    component: <SignInBasic />,
  },
];
}
