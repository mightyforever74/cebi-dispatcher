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

// ── Dispatcher — canlı operasyonel ekranlar ──
import Drivers from "layouts/dispatcher/drivers";
import Tasks from "layouts/dispatcher/tasks";
import OptimizeTask from "layouts/dispatcher/tasks/optimize";
import Exceptions from "layouts/dispatcher/exceptions";
import Vehicles from "layouts/dispatcher/vehicles";
import LiveFleetMap from "layouts/live-fleet-map/LiveFleetMap";

// ── Optimizasyon — gated placeholder'lar (FEAT-001 / FEAT-008) ──
import TollAnalyticsPlaceholder from "layouts/optimization/TollAnalyticsPlaceholder";
import TourPlanningPlaceholder from "layouts/optimization/TourPlanningPlaceholder";

// ── Sistem ──
import Settings from "layouts/pages/account/settings";

import ForgotPassword from "layouts/authentication/forgot-password";
import SignInBasic from "layouts/authentication/sign-in/basic";
// FEAT-SaaS S3 (05.08) — Sayfa 1
import SubscriptionPage from "layouts/subscription";
import B2bApiPage from "layouts/subscription/b2bApi";
// FEAT-SaaS S4 (05.08) — Supervizor ikilisi (D-S2 gate ile korunur)
import SupervisorPage from "layouts/supervisor";
import CustomerDetailPage from "layouts/supervisor/customerDetail";

// ── icons ──
import Icon from "@mui/material/Icon";

const routes = [
  // ═══════════ GRUP 1 — OPERASYON MERKEZİ ═══════════
  { type: "title", title: "Operations Center", key: "title-operations" },
  {
    type: "collapse",
    name: "Live Fleet Tracking",
    key: "live-fleet-map",
    icon: <Icon fontSize="medium">map</Icon>,
    route: "/dashboards/live-fleet-map",
    component: <LiveFleetMap />,
    noCollapse: true,
  },
  {
    type: "collapse",
    name: "Tasks & Dispatch",
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
    name: "Exception Management (Alerts)",
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
  { type: "title", title: "AI & Optimization", key: "title-optimization" },
  {
    type: "collapse",
    name: "Smart Route Optimization 🔒 (Phase 1.1)",
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
    name: "Cost & Toll Inspection 🔒 (July 2026)",
    key: "toll-analytics",
    icon: (
      <Icon fontSize="medium" color="warning">
        euro_symbol
      </Icon>
    ),
    route: "/optimization/toll-analytics",
    component: <TollAnalyticsPlaceholder />,
    noCollapse: true,
  },

  // ═══════════ GRUP 3 — MATRİS & MASTER DATA ═══════════
  { type: "title", title: "Matrix & Master Data", key: "title-masterdata" },
  {
    type: "collapse",
    name: "Driver Management",
    key: "driver-list",
    icon: <Icon fontSize="medium">people</Icon>,
    route: "/dispatcher/drivers",
    component: <Drivers />,
    noCollapse: true,
  },
  {
    type: "collapse",
    name: "Vehicle & Equipment Management",
    key: "vehicle-list",
    icon: <Icon fontSize="medium">local_shipping</Icon>,
    route: "/dispatcher/vehicles",
    component: <Vehicles />,
    noCollapse: true,
  },

  // ═══════════ GRUP 4 — SİSTEM ═══════════
  { type: "divider", key: "divider-system" },
  { type: "title", title: "System", key: "title-system" },
  {
    type: "collapse",
    name: "Tenant & System Settings",
    key: "system-settings",
    icon: <Icon fontSize="medium">settings</Icon>,
    route: "/system/settings",
    component: <Settings />,
    noCollapse: true,
  },

  // ═══════════ GRUP 5 — YÖNETİM ═══════════
  { type: "title", title: "Administration", key: "title-management" },
  {
    type: "collapse",
    name: "Subscription",
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
    name: "Supervisor",
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

export default routes;
