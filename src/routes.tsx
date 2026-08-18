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

// ── Demo / şablon layout'ları (Geliştirici çekmecesi altında korunur) ──
import Calendar from "layouts/applications/calendar";
import DataTables from "layouts/applications/data-tables";
import Kanban from "layouts/applications/kanban";
import Wizard from "layouts/applications/wizard";
import ForgotPassword from "layouts/authentication/forgot-password";
import ResetCover from "layouts/authentication/reset-password/cover";
import SignInBasic from "layouts/authentication/sign-in/basic";
import SignInCover from "layouts/authentication/sign-in/cover";
import SignInIllustration from "layouts/authentication/sign-in/illustration";
import SignUpCover from "layouts/authentication/sign-up/cover";
import Analytics from "layouts/dashboards/analytics";
import Sales from "layouts/dashboards/sales";
import OrderDetails from "layouts/ecommerce/orders/order-details";
import OrderList from "layouts/ecommerce/orders/order-list";
import EditProduct from "layouts/ecommerce/products/edit-product";
import NewProduct from "layouts/ecommerce/products/new-product";
// FEAT-SaaS S3 (05.08) — Sayfa 1
import SubscriptionPage from "layouts/subscription";
import B2bApiPage from "layouts/subscription/b2bApi";
// FEAT-SaaS S4 (05.08) — Supervizor ikilisi (D-S2 gate ile korunur)
import SupervisorPage from "layouts/supervisor";
import CustomerDetailPage from "layouts/supervisor/customerDetail";
import ProductPage from "layouts/ecommerce/products/product-page";
import Billing from "layouts/pages/account/billing";
import Invoice from "layouts/pages/account/invoice";
import Charts from "layouts/pages/charts";
import Notifications from "layouts/pages/notifications";
import PricingPage from "layouts/pages/pricing-page";
import AllProjects from "layouts/pages/profile/all-projects";
import ProfileOverview from "layouts/pages/profile/profile-overview";
import Timeline from "layouts/pages/projects/timeline";
import RTL from "layouts/pages/rtl";
import NewUser from "layouts/pages/users/new-user";
import Widgets from "layouts/pages/widgets";

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
            name: "My Profile",
            key: "my-profile",
            route: "/pages/profile/profile-overview",
            component: <ProfileOverview />,
          },
          {
            name: "All Projects",
            key: "all-projects",
            route: "/pages/profile/all-projects",
            component: <AllProjects />,
          },
          {
            name: "Settings",
            key: "demo-settings",
            route: "/pages/account/settings",
            component: <Settings />,
          },
          {
            name: "Logout",
            key: "logout",
            route: "/authentication/sign-in/basic",
            component: <SignInBasic />,
          },
        ],
      },
      {
        name: "Dashboards (Demo)",
        key: "demo-dashboards",
        collapse: [
          {
            name: "Analytics",
            key: "analytics",
            route: "/dashboards/analytics",
            component: <Analytics />,
          },
          { name: "Sales", key: "sales", route: "/dashboards/sales", component: <Sales /> },
        ],
      },
      {
        name: "Pages (Demo)",
        key: "demo-pages",
        collapse: [
          {
            name: "Profile Overview",
            key: "profile-overview",
            route: "/pages/profile/profile-overview",
            component: <ProfileOverview />,
          },
          {
            name: "New User",
            key: "new-user",
            route: "/pages/users/new-user",
            component: <NewUser />,
          },
          {
            name: "Billing",
            key: "billing",
            route: "/pages/account/billing",
            component: <Billing />,
          },
          {
            name: "Invoice",
            key: "invoice",
            route: "/pages/account/invoice",
            component: <Invoice />,
          },
          {
            name: "Timeline",
            key: "timeline",
            route: "/pages/projects/timeline",
            component: <Timeline />,
          },
          {
            name: "Pricing Page",
            key: "pricing-page",
            route: "/pages/pricing-page",
            component: <PricingPage />,
          },
          { name: "RTL", key: "rtl", route: "/pages/rtl", component: <RTL /> },
          { name: "Widgets", key: "widgets", route: "/pages/widgets", component: <Widgets /> },
          { name: "Charts", key: "charts", route: "/pages/charts", component: <Charts /> },
          {
            name: "Notifications",
            key: "notifications",
            route: "/pages/notifications",
            component: <Notifications />,
          },
        ],
      },
      {
        name: "Applications (Demo)",
        key: "demo-applications",
        collapse: [
          { name: "Kanban", key: "kanban", route: "/applications/kanban", component: <Kanban /> },
          { name: "Wizard", key: "wizard", route: "/applications/wizard", component: <Wizard /> },
          {
            name: "Data Tables",
            key: "data-tables",
            route: "/applications/data-tables",
            component: <DataTables />,
          },
          {
            name: "Calendar",
            key: "calendar",
            route: "/applications/calendar",
            component: <Calendar />,
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
      {
        name: "Ecommerce (Demo)",
        key: "demo-ecommerce",
        collapse: [
          {
            name: "New Product",
            key: "new-product",
            route: "/ecommerce/products/new-product",
            component: <NewProduct />,
          },
          {
            name: "Edit Product",
            key: "edit-product",
            route: "/ecommerce/products/edit-product",
            component: <EditProduct />,
          },
          {
            name: "Product Page",
            key: "product-page",
            route: "/ecommerce/products/product-page",
            component: <ProductPage />,
          },
          {
            name: "Order List",
            key: "order-list",
            route: "/ecommerce/orders/order-list",
            component: <OrderList />,
          },
          {
            name: "Order Details",
            key: "order-details",
            route: "/ecommerce/orders/order-details",
            component: <OrderDetails />,
          },
        ],
      },
      {
        name: "Authentication (Demo)",
        key: "demo-authentication",
        collapse: [
          {
            name: "Sign In Basic",
            key: "sign-in-basic",
            route: "/authentication/sign-in/basic",
            component: <SignInBasic />,
          },
          {
            name: "Sign In Cover",
            key: "sign-in-cover",
            route: "/authentication/sign-in/cover",
            component: <SignInCover />,
          },
          {
            name: "Sign In Illustration",
            key: "sign-in-illustration",
            route: "/authentication/sign-in/illustration",
            component: <SignInIllustration />,
          },
          {
            name: "Sign Up Cover",
            key: "sign-up-cover",
            route: "/authentication/sign-up/cover",
            component: <SignUpCover />,
          },
          {
            name: "Reset Password",
            key: "reset-cover",
            route: "/authentication/reset-password/cover",
            component: <ResetCover />,
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
