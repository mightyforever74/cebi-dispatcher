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
  { type: "title", title: "Operasyon Merkezi", key: "title-operations" },
  {
    type: "collapse",
    name: "Canlı Fleet İzleme",
    key: "live-fleet-map",
    icon: <Icon fontSize="medium">map</Icon>,
    route: "/dashboards/live-fleet-map",
    component: <LiveFleetMap />,
    noCollapse: true,
  },
  {
    type: "collapse",
    name: "Görev & Sevk Yönetimi",
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
    name: "İstisna Yönetimi (İkaz)",
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
  { type: "title", title: "Yapay Zekâ & Optimizasyon", key: "title-optimization" },
  {
    type: "collapse",
    name: "Akıllı Rota Optimizasyonu 🔒 (Phase 1.1)",
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
    name: "Maliyet & Otoban Teftişi 🔒 (Temmuz 2026)",
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
  { type: "title", title: "Matris & Master Data", key: "title-masterdata" },
  {
    type: "collapse",
    name: "Sürücü Yönetimi",
    key: "driver-list",
    icon: <Icon fontSize="medium">people</Icon>,
    route: "/dispatcher/drivers",
    component: <Drivers />,
    noCollapse: true,
  },
  {
    type: "collapse",
    name: "Araç & Ekipman Yönetimi",
    key: "vehicle-list",
    icon: <Icon fontSize="medium">local_shipping</Icon>,
    route: "/dispatcher/vehicles",
    component: <Vehicles />,
    noCollapse: true,
  },

  // ═══════════ GRUP 4 — SİSTEM & GELİŞTİRİCİ ARAÇLARI ═══════════
  { type: "divider", key: "divider-system" },
  { type: "title", title: "Sistem & Geliştirici Araçları", key: "title-system" },
  {
    type: "collapse",
    name: "Tenant & Sistem Ayarları",
    key: "system-settings",
    icon: <Icon fontSize="medium">settings</Icon>,
    route: "/system/settings",
    component: <Settings />,
    noCollapse: true,
  },
  {
    type: "collapse",
    name: "Geliştirici & Demo Araçları (Demo)",
    key: "developer-preview-drawer",
    icon: (
      <Icon fontSize="medium" sx={{ opacity: 0.5 }}>
        view_in_ar
      </Icon>
    ),
    collapse: [
      {
        name: "Profil Çekmecesi (Demo)",
        key: "demo-profile",
        collapse: [
          {
            name: "Logout",
            key: "logout",
            route: "/authentication/sign-in/basic",
            component: <SignInBasic />,
          },
        ],
      },
      {
        name: "Abonelik",
        key: "subscription",
        collapse: [
          {
            name: "Araç Kotası & Talep",
            key: "subscription-quota",
            route: "/subscription",
            component: <SubscriptionPage />,
          },
          {
            name: "TulipFleet Connect (B2B API)",
            key: "subscription-b2b-api",
            route: "/subscription/b2b-api",
            component: <B2bApiPage />,
          },
        ],
      },
      {
        name: "Supervizör",
        key: "supervisor",
        collapse: [
          {
            name: "Komuta Merkezi",
            key: "supervisor-command",
            route: "/admin/supervisor",
            component: <SupervisorPage />,
          },
          {
            name: "Müşteri Detay",
            key: "supervisor-customer-detail",
            route: "/admin/supervisor/customer-detail",
            component: <CustomerDetailPage />,
          },
        ],
      },
    ],
  },
  // Sidenav'da GORUNMEZ (type collapse/title/divider degil) — login "Sifremi unuttum"
  // linkinden ve AuthGate uzerinden erisilir. App.tsx getRoutes() route+component bakar.
  {
    type: "route",
    key: "forgot-password",
    route: "/authentication/forgot-password",
    component: <ForgotPassword />,
  },
];

export default routes;
