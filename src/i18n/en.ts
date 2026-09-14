/**
 * English is the canonical dictionary. Nested `as const` object — tr.ts / nl.ts
 * must `satisfies TranslationSchema` (same keys, no extras).
 */
export const en = {
  nav: {
    operationsCenter: "Operations Center",
    liveFleet: "Live Fleet Tracking",
    tasksDispatch: "Tasks & Dispatch",
    exceptions: "Exception Management (Alerts)",
    aiOptimization: "AI & Optimization",
    smartRoute: "Smart Route Optimization 🔒 (Phase 1.1)",
    costToll: "Cost & Toll Inspection 🔒 (July 2026)",
    matrixMaster: "Matrix & Master Data",
    driverManagement: "Driver Management",
    vehicleEquipment: "Vehicle & Equipment Management",
    system: "System",
    tenantSettings: "Tenant & System Settings",
    administration: "Administration",
    subscription: "Subscription",
    supervisor: "Supervisor",
  },
  login: {
    title: "Sign in",
    brand: "TulipFleet Dispatcher",
    email: "Email",
    password: "Password",
    forgotPassword: "Forgot password",
    rememberMe: "Remember me",
    submit: "sign in",
    submitting: "signing in...",
    failed: "Sign-in failed",
  },
  footer: {
    site: "Site",
    subscription: "Subscription",
    contact: "Contact",
  },
  dialog: {
    copyToClipboard: "Copy to clipboard",
    copied: "Copied ✓",
    cancel: "Cancel",
  },
  map: {
    routes: "Routes",
    bulletAll: "• All",
    bulletCount: "• {n}",
    routeLayers: "Route layers",
    collapsePanel: "Collapse panel",
    showAllRoutes: "Show all routes",
    selectDriver: "Select driver…",
    noDriverData: "No driver data",
    unassigned: " (Unassigned)",
    clearSelection_one: "Clear selection ({count})",
    clearSelection_other: "Clear selection ({count})",
  },
} as const;
