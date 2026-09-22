/**
=========================================================
* TulipFleet Dispatcher — Design Tokens (Single Source of Truth)
=========================================================
* D1 "Tema Köprüsü" (docs/UI_D1_REPORT.md).
*
* KURAL: Bu paketten sonra `src/assets/theme/**` ve `src/assets/theme-dark/**`
* altında YENİ hex/rgba literal EKLENMEZ. Her renk buradan içe aktarılır.
* Kanıt: `Select-String -Path src\assets\theme\components -Pattern "#[0-9a-f]{3,8}"` → 0 sonuç
* (docs/UI_D1_REPORT.md §2).
*
* Kaynaklar (D0 kanıtlı):
*  - Landing token adları/değerleri: C:\tulipfleet-landing\src\styles\global.css:1-38 (Tailwind v4 @theme)
*  - MD2 PRO taban palet: src/assets/theme/base/colors.ts (D1 öncesi hali) — değerler
*    BİREBİR korunarak buraya taşındı (görsel regresyon yok).
*  - TaskStatus (9 CHECK): src/layouts/dispatcher/tasks/index.tsx:56-78 (`public.tasks` CHECK constraint)
*  - AlertSeverity: src/hooks/useExceptions.ts:10 (`ExceptionSeverity`) — repo içinde bulunan TEK
*    "severity" sözleşmesi; ayrı bir mobil-manifest dokümanı bu D1 turunda repo içinde bulunamadı
*    (bkz. docs/UI_D0_DISCOVERY.md §6). Değerler bu tip ile birebir aynı tutuldu.
*  - ExceptionType (6 tip): src/layouts/dispatcher/exceptions/index.tsx:38-45 (`TYPE_LABEL`)
*  - VehicleConnectivityStatus: D1 görev tanımında verilen 4 değer (online/stale/offline/maintenance) —
*    mevcut `VehicleRow.status` (available/in_use/maintenance/retired, src/types/dispatcher.ts) ile
*    KARIŞTIRILMAMALI; bu, bağlantı/telemetri durumu için AYRI bir ad alanıdır.
*/

// =========================================================================
// 1) LANDING KÖPRÜSÜ — token adları landing'den korunmuştur (camelCase)
//    Kaynak: C:\tulipfleet-landing\src\styles\global.css:3-38
// =========================================================================
export const landing = {
  navy: "#0a0f24",
  navyDeep: "#0d1427",
  navyElevated: "#121a32",
  navyInk: "#070b18",
  navyFog: "#c5cde3",
  /**
   * Light-theme secondary text / input labels on `#f0f2f5`. Landing
   * `--color-roadmap` (#64748b) is 4.24:1 on page bg; this is the ≥4.5:1 step.
   */
  navyFog700: "#5b6577",
  /**
   * Landing'in `color-mix(in srgb, var(--color-navy-elevated) 62%, white 16%)`
   * (global.css:9) ifadesinin JS/MUI tarafı için statik yaklaşık karşılığı
   * (renk-hesabı derleme zamanında yapılamadığından elle hesaplanmıştır).
   * global.css'teki CSS Custom Property karşılığı `color-mix()` ile BİREBİR
   * landing sözdizimini kullanır (bkz. bu paketteki global.css).
   */
  navyLine: "#43495c",
  offwhite: "#f8fafc",
  emerald: "#10b981",
  emeraldDim: "rgba(16, 185, 129, 0.1)",
  /** Landing pazarlama vurgu rengi (turuncu-kırmızı). D1'de MUI `primary`e
   * BAĞLANMADI — TulipFleet ürün markası (mor, aşağıdaki `brand`) zaten
   * tüm ekranlarda kurulu; bu bir rebrand kararı değildir (Cem onayı gerekir,
   * bkz. docs/UI_D0_DISCOVERY.md §2 A4). Yalnızca köprü/referans amaçlı taşındı. */
  accent: "#ff5722",
  accentSoft: "#ff7043",
  accentDim: "rgba(255, 87, 34, 0.14)",
  glow: {
    accent: "0 0 24px rgba(255, 87, 34, 0.35)",
    accentSoft: "0 0 16px rgba(255, 87, 34, 0.2)",
  },
} as const;

// =========================================================================
// 2) ÜRÜN MARKASI — TulipFleet mor/turuncu gradyanı (ADR-0001).
//    Değerler mevcut src/assets/theme/base/colors.ts'ten BİREBİR taşındı.
// =========================================================================
export const brand = {
  primary: "#7C3AED",
  primaryFocus: "#6D28D9",
  gradientFrom: "#7C3AED",
  gradientTo: "#FB7A1E",
} as const;

// =========================================================================
// 3) MD2 PRO TABAN PALET — LIGHT (src/assets/theme/base/colors.ts'in D1
//    ÖNCESİ literal değerleri; görsel fark yaratmamak için birebir kopyalandı)
// =========================================================================
export const paletteLight = {
  backgroundDefault: "#f0f2f5",
  textMain: landing.navyFog700,
  textFocus: landing.navyFog700,
  white: "#ffffff",
  black: "#000000",
  primaryMain: "#7C3AED",
  primaryFocus: "#6D28D9",
  secondaryMain: landing.navyFog700,
  secondaryFocus: landing.navyFog700,
  infoMain: "#155fc0",
  infoFocus: "#1662C4",
  successMain: "#4CAF50",
  successFocus: "#67bb6a",
  warningMain: "#fb8c00",
  warningFocus: "#fc9d26",
  errorMain: "#F44335",
  errorFocus: "#f65f53",
  lightMain: "#f0f2f5",
  lightFocus: "#f0f2f5",
  darkMain: "#344767",
  darkFocus: "#2c3c58",
  grey: {
    100: "#f8f9fa",
    200: "#f0f2f5",
    300: "#dee2e6",
    400: "#ced4da",
    500: "#adb5bd",
    600: "#6c757d",
    700: "#495057",
    800: "#343a40",
    900: "#212529",
  },
  gradients: {
    primary: { main: "#A855F7", state: "#7C3AED" },
    brand: { main: "#7C3AED", state: "#FB7A1E" },
    secondary: { main: "#747b8a", state: "#495361" },
    info: { main: "#49a3f1", state: "#1A73E8" },
    success: { main: "#66BB6A", state: "#43A047" },
    warning: { main: "#FFA726", state: "#FB8C00" },
    error: { main: "#EF5350", state: "#E53935" },
    light: { main: "#EBEFF4", state: "#CED4DA" },
    dark: { main: "#42424a", state: "#191919" },
  },
  socialMediaColors: {
    facebook: { main: "#3b5998", dark: "#344e86" },
    twitter: { main: "#55acee", dark: "#3ea1ec" },
    instagram: { main: "#125688", dark: "#0e456d" },
    linkedin: { main: "#0077b5", dark: "#00669c" },
    pinterest: { main: "#cc2127", dark: "#b21d22" },
    youtube: { main: "#e52d27", dark: "#d41f1a" },
    vimeo: { main: "#1ab7ea", dark: "#13a3d2" },
    slack: { main: "#3aaf85", dark: "#329874" },
    dribbble: { main: "#ea4c89", dark: "#e73177" },
    github: { main: "#24292e", dark: "#171a1d" },
    reddit: { main: "#ff4500", dark: "#e03d00" },
    tumblr: { main: "#35465c", dark: "#2a3749" },
  },
  badgeColors: {
    primary: { background: "#f8b3ca", text: "#cc084b" },
    secondary: { background: "#d7d9e1", text: "#6c757d" },
    info: { background: "#aecef7", text: "#074a9e" },
    success: { background: "#bce2be", text: "#339537" },
    warning: { background: "#ffd59f", text: "#c87000" },
    error: { background: "#fcd3d0", text: "#c1170a" },
    light: { background: "#ffffff", text: "#c7d3de" },
    dark: { background: "#8097bf", text: "#1e2e4a" },
  },
  coloredShadows: {
    primary: "#7c3aed",
    secondary: "#110e0e",
    info: "#00bbd4",
    success: "#4caf4f",
    warning: "#ff9900",
    error: "#f44336",
    light: "#adb5bd",
    dark: "#404040",
  },
  inputBorderColor: "#d2d6da",
  tabsIndicatorShadow: "#ddd",
} as const;

// =========================================================================
// 4) MD2 PRO TABAN PALET — DARK (src/assets/theme-dark/base/colors.ts'in
//    D1 ÖNCESİ literal değerleri; görsel fark yaratmamak için birebir kopyalandı)
// =========================================================================
export const paletteDark = {
  backgroundDefault: "#1a2035",
  backgroundSidenav: "#1f283e",
  backgroundCard: "#202940",
  textMain: "#ffffffcc",
  textFocus: "#ffffffcc",
  textPrimary: "#ECEEF7",
  textSecondary: "#8f9bb3",
  textDisabled: "#65718c",
  white: "#ffffff",
  black: "#000000",
  primaryMain: "#7C3AED",
  primaryFocus: "#6D28D9",
  secondaryMain: "#7b809a",
  secondaryFocus: "#8f93a9",
  infoMain: "#1A73E8",
  infoFocus: "#1662C4",
  successMain: "#4CAF50",
  successFocus: "#67bb6a",
  warningMain: "#fb8c00",
  warningFocus: "#fc9d26",
  errorMain: "#F44335",
  errorFocus: "#f65f53",
  lightMain: "#f0f2f566",
  lightFocus: "#f0f2f566",
  darkMain: "#344767",
  darkFocus: "#2c3c58",
  grey: {
    100: "#f8f9fa",
    200: "#f0f2f5",
    300: "#dee2e6",
    400: "#ced4da",
    500: "#adb5bd",
    600: "#6c757d",
    700: "#495057",
    800: "#343a40",
    900: "#212529",
  },
  gradients: {
    primary: { main: "#A855F7", state: "#7C3AED" },
    brand: { main: "#7C3AED", state: "#FB7A1E" },
    secondary: { main: "#747b8a", state: "#495361" },
    info: { main: "#49a3f1", state: "#1A73E8" },
    success: { main: "#66BB6A", state: "#43A047" },
    warning: { main: "#FFA726", state: "#FB8C00" },
    error: { main: "#EF5350", state: "#E53935" },
    light: { main: "#EBEFF4", state: "#CED4DA" },
    dark: { main: "#323a54", state: "#1a2035" },
  },
  socialMediaColors: {
    facebook: { main: "#3b5998", dark: "#344e86" },
    twitter: { main: "#55acee", dark: "#3ea1ec" },
    instagram: { main: "#125688", dark: "#0e456d" },
    linkedin: { main: "#0077b5", dark: "#00669c" },
    pinterest: { main: "#cc2127", dark: "#b21d22" },
    youtube: { main: "#e52d27", dark: "#d41f1a" },
    vimeo: { main: "#1ab7ea", dark: "#13a3d2" },
    slack: { main: "#3aaf85", dark: "#329874" },
    dribbble: { main: "#ea4c89", dark: "#e73177" },
    github: { main: "#24292e", dark: "#171a1d" },
    reddit: { main: "#ff4500", dark: "#e03d00" },
    tumblr: { main: "#35465c", dark: "#2a3749" },
  },
  badgeColors: {
    primary: { background: "#f8b3ca", text: "#cc084b" },
    secondary: { background: "#d7d9e1", text: "#6c757d" },
    info: { background: "#aecef7", text: "#095bc6" },
    success: { background: "#bce2be", text: "#339537" },
    warning: { background: "#ffd59f", text: "#c87000" },
    error: { background: "#fcd3d0", text: "#f61200" },
    light: { background: "#ffffff", text: "#c7d3de" },
    dark: { background: "#8097bf", text: "#1e2e4a" },
  },
  coloredShadows: {
    primary: "#7c3aed",
    secondary: "#110e0e",
    info: "#00bbd4",
    success: "#4caf4f",
    warning: "#ff9900",
    error: "#f44336",
    light: "#adb5bd",
    dark: "#404040",
  },
  inputBorderColor: "#d2d6da",
  tabsIndicatorShadow: "#ddd",
} as const;

/** Stepper bileşenlerindeki (Mui-inactive) tek-off vurgu rengi.
 * D1 öncesi `src/assets/theme/components/stepper/{stepIcon,stepConnector,stepLabel}.ts`
 * ve theme-dark eşdeğerlerinde literal `"#9fc9ff"` idi; görsel fark yaratmadan
 * buraya taşındı (D0 §2 A2 hex-sızıntı bulgusu, adım 2.6 kanıtı). */
export const misc = {
  stepperInactive: "#9fc9ff",
} as const;

// =========================================================================
// 5) OPERASYONEL DURUM TOKEN'LARI (prod/manifest sözleşmesiyle birebir)
// =========================================================================

/** 9 CHECK değeri — src/layouts/dispatcher/tasks/index.tsx:56-78 (`public.tasks` CHECK constraint) */
export type TaskStatus =
  | "pending"
  | "pending_review"
  | "accepted"
  | "assigned"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "withdrawn";

/** src/hooks/useExceptions.ts:10 `ExceptionSeverity` ile birebir. */
export type AlertSeverity = "low" | "medium" | "high" | "critical";

/** Araç bağlantı/telemetri durumu (D1 görev tanımı) — VehicleRow.status
 * (available/in_use/maintenance/retired) ile KARIŞTIRILMAMALI, ayrı ad alanı. */
export type VehicleConnectivityStatus = "online" | "stale" | "offline" | "maintenance";

/** `public.vehicles.status` — liste ekranı (D4 StatusChip kind=vehicle ops). */
export type VehicleOpsStatus = "available" | "in_use" | "maintenance" | "retired";

/** `public.drivers.status` — liste ekranı (D4 StatusChip kind=vehicle lookup). */
export type DriverDutyStatus = "available" | "on_task" | "task_pending" | "on_leave" | "offline";

export type TaskPriority = "high" | "normal" | "low";

/** 6 tip — src/layouts/dispatcher/exceptions/index.tsx:38-45 (`TYPE_LABEL`) */
export type ExceptionType =
  | "eta_delay"
  | "driver_offline"
  | "driver_location_mismatch"
  | "compliance_zone_breach"
  | "traffic_impact"
  | "dock_conflict"
  | "rule_violation";

export interface StatusColorSet {
  bg: string;
  fg: string;
  border: string;
}

/**
 * Her durum kümesi mevcut MD2 `badgeColors`/`main` çiftlerinden türetilmiştir
 * (D0'da tespit edilen 4 bağımsız `statusColor()` fonksiyonunun — tasks/vehicles/
 * drivers/exceptions — TEK kaynaktan beslenmesi hedeflenir; bkz. docs/UI_D0_DISCOVERY.md
 * §4 C1). Ekran dosyaları bu D1 paketinde DEĞİŞTİRİLMEDİ — tüketim D2 işidir.
 */
const badge = paletteLight.badgeColors;
const main = {
  secondary: paletteLight.secondaryMain,
  info: paletteLight.infoMain,
  primary: paletteLight.primaryMain,
  success: paletteLight.successMain,
  warning: paletteLight.warningMain,
  error: paletteLight.errorMain,
  dark: paletteLight.darkMain,
};

function fromBadge(name: keyof typeof badge, borderColor: string): StatusColorSet {
  return { bg: badge[name].background, fg: badge[name].text, border: borderColor };
}

export const status: {
  task: Record<TaskStatus, StatusColorSet>;
  alert: Record<AlertSeverity, StatusColorSet>;
  vehicle: Record<VehicleConnectivityStatus, StatusColorSet>;
  vehicleOps: Record<VehicleOpsStatus, StatusColorSet>;
  driver: Record<DriverDutyStatus, StatusColorSet>;
  exception: Record<ExceptionType, StatusColorSet>;
  priority: Record<TaskPriority, StatusColorSet>;
  unknown: StatusColorSet;
} = {
  // Renk eşlemesi src/layouts/dispatcher/tasks/index.tsx:56-78 ile birebir.
  task: {
    pending: fromBadge("secondary", main.secondary),
    pending_review: fromBadge("warning", main.warning),
    accepted: fromBadge("info", main.info),
    assigned: fromBadge("info", main.info),
    in_progress: fromBadge("primary", main.primary),
    completed: fromBadge("success", main.success),
    rejected: fromBadge("error", main.error),
    cancelled: fromBadge("error", main.error),
    withdrawn: fromBadge("dark", main.dark),
  },
  // Renk eşlemesi src/layouts/dispatcher/exceptions/index.tsx:31-36 (SEVERITY_COLOR) ile birebir.
  alert: {
    critical: fromBadge("error", main.error),
    high: fromBadge("warning", main.warning),
    medium: fromBadge("info", main.info),
    low: fromBadge("dark", main.dark),
  },
  // Yeni ad alanı (bağlantı durumu) — gerekçe: online=success, stale=warning
  // (veri gecikmiş ama bağlı), offline=error, maintenance=secondary (planlı/
  // acil olmayan, "stale" ile karışmasın diye ayrı tonlandı). Karar D2'de
  // Cem tarafından değiştirilebilir.
  vehicle: {
    online: fromBadge("success", main.success),
    stale: fromBadge("warning", main.warning),
    offline: fromBadge("error", main.error),
    maintenance: fromBadge("secondary", main.secondary),
  },
  // 6 tip için nötr bilgi tonu (mevcut ekranda TYPE_LABEL renksiz metindi —
  // D0'da ayrı bir renk kodlaması yoktu; burada info tonunda tutarlı hale getirildi).
  exception: {
    eta_delay: fromBadge("warning", main.warning),
    driver_offline: fromBadge("error", main.error),
    driver_location_mismatch: fromBadge("warning", main.warning),
    compliance_zone_breach: fromBadge("error", main.error),
    traffic_impact: fromBadge("info", main.info),
    dock_conflict: fromBadge("info", main.info),
    rule_violation: fromBadge("warning", main.warning),
  },
  // public.vehicles.status — eski vehicles/index.tsx statusColor ile birebir.
  vehicleOps: {
    available: fromBadge("success", main.success),
    in_use: fromBadge("info", main.info),
    maintenance: fromBadge("warning", main.warning),
    retired: fromBadge("error", main.error),
  },
  // public.drivers.status — eski drivers/index.tsx statusColor ile birebir.
  driver: {
    available: fromBadge("success", main.success),
    on_task: fromBadge("info", main.info),
    task_pending: fromBadge("warning", main.warning),
    on_leave: fromBadge("warning", main.warning),
    offline: fromBadge("error", main.error),
  },
  priority: {
    high: fromBadge("error", main.error),
    normal: fromBadge("info", main.info),
    low: fromBadge("secondary", main.secondary),
  },
  unknown: fromBadge("secondary", main.secondary),
};

/** ConfirmDialogShell — D5. Hex yalnız burada; light/dark chrome + severity. */
export const dialog = {
  danger: "#f44336",
  dangerDark: "#b71c1c",
  dangerBg: "rgba(244,67,54,0.08)",
  warning: "#ff9800",
  warningDark: "#e65100",
  warningBg: "rgba(255,152,0,0.10)",
  accent: brand.primary,
  accentDark: "#5b21b6",
  accentBg: "rgba(124,58,237,0.10)",
  onAccent: paletteLight.white,
  radiusPx: 16,
  dark: {
    panelBg: paletteDark.backgroundDefault,
    border: "#2c3454",
    inputBg: "#131826",
    textMuted: "#B0BEC5",
    textFaint: "#8f9bb3",
    text: paletteDark.white,
    cardWash: "rgba(255,255,255,0.03)",
  },
  light: {
    panelBg: paletteLight.white,
    border: paletteLight.grey[300],
    inputBg: paletteLight.grey[100],
    textMuted: landing.navyFog700,
    textFaint: paletteLight.grey[600],
    text: paletteLight.darkMain,
    cardWash: paletteLight.grey[100],
  },
} as const;

/** Form field error text — ≥4.5:1 on page/panel backgrounds. */
export const form = {
  errorFgLight: "#B71C1C",
  errorFgDark: "#FF8A80",
} as const;

// =========================================================================
// 5b) LIVE MAP — D3 (basemap, chrome, eşikler). Hex yalnız burada.
//     Marker renkleri `status.vehicle.*` (online/stale/offline); bu nesne
//     panel/basemap/rota/küme ve tek stale eşiğini taşır.
// =========================================================================

export const map = {
  /** Son telemetri bu süreyi aşınca araç marker'ı `stale`. Tek kaynak. */
  staleMs: 2 * 60 * 1000,
  /** MQTT son mesaj bu süreden yeniyse bağlantı rozeti `live`. */
  liveMs: 30 * 1000,
  /** REST snapshot yedekleme aralığı — `useFleetSnapshot` ile aynı. */
  restPollMs: 20 * 1000,
  clusterMinVehicles: 20,
  /** Şehir ölçeği — bu zoom ve üstünde küme kapanır. */
  clusterDisableZoom: 14,
  panelWidthPx: 280,
  tiles: {
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_2n9e_1_5c749a815246c8c8b2b608b7",
    light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_2n9e_1_5c749a815246c8c8b2b608b7",
  },
  route: brand.primary,
  routeHover: paletteLight.gradients.primary.main,
  selected: brand.primary,
  markerStroke: paletteLight.white,
  ze: paletteLight.infoMain,
  cluster: {
    bg: main.success,
    fg: paletteLight.white,
    stroke: paletteLight.white,
  },
  dark: {
    sidebarBg: paletteDark.backgroundDefault,
    panelBg: landing.navyInk,
    panelBgSel: paletteDark.backgroundCard,
    border: landing.navyLine,
    inputBg: landing.navyDeep,
    text: paletteDark.white,
    textMuted: paletteDark.textSecondary,
    textFaint: paletteDark.textDisabled,
    leafletBg: "#191a1a",
    chipBg: landing.navyDeep,
  },
  light: {
    sidebarBg: landing.offwhite,
    panelBg: paletteLight.white,
    panelBgSel: paletteLight.grey[200],
    border: paletteLight.grey[300],
    inputBg: paletteLight.grey[100],
    text: paletteLight.darkMain,
    textMuted: paletteLight.grey[600],
    textFaint: paletteLight.grey[500],
    leafletBg: paletteLight.backgroundDefault,
    chipBg: paletteLight.grey[200],
  },
} as const;

// =========================================================================
// 6) YOĞUNLUK / RADIUS / SHADOW / GLASS
// =========================================================================

/** Satır yüksekliği (px) — DataTable "compact/comfortable" anahtarı D2'de bağlanacak.
 * `navbar` D2 kabuk yüksekliği (landing Header paritesi, 64px). */
export const density = {
  compact: 40,
  comfortable: 56,
  navbar: 64,
} as const;

/** src/assets/theme/base/borders.ts + theme-dark eşdeğerinin px değerleriyle
 * BİREBİR (görsel fark yok) — artık bu dosyalar da buradan besleniyor. */
export const radius = {
  xs: 1.6,
  sm: 2,
  md: 6,
  lg: 8,
  xl: 12,
  xxl: 16,
  section: 160,
} as const;

/** Landing köprüsü — kart/nav/consent gölgeleri (global.css:23-31). MD2'nin
 * kendi prosedürel `boxShadows.*` sistemi (theme/base/boxShadows.ts) AYRI ve
 * dokunulmadı; bu set yalnızca gelecekteki glass/landing-hizalı bileşenler içindir. */
export const shadow = {
  nav: "0 8px 32px rgb(7 11 24 / 0.45)",
  consent: "0 -8px 40px rgb(7 11 24 / 0.45)",
  heroWindow: "0 0 36px rgb(255 87 34 / 0.1), 0 18px 48px rgb(7 11 24 / 0.48), 0 4px 14px rgb(7 11 24 / 0.32)",
  glowAccent: landing.glow.accent,
  glowAccentSoft: landing.glow.accentSoft,
} as const;

/** GlassPanel (src/components/GlassPanel/index.tsx:44-53) ile BİREBİR aynı
 * sayısal değerler — D2'de o bileşen bu token'ı tüketecek şekilde
 * refactor edilebilir (bu pakette dokunulmadı). */
export const glass = {
  blurPx: 16,
  saturatePct: 140,
  opacity: { dark: 0.62, light: 0.7 },
  /** `prefers-reduced-transparency: reduce` aktifken düşülecek opak fallback. */
  reducedOpacity: { dark: 0.96, light: 0.96 },
} as const;

// =========================================================================
// 7) A11Y — prefers-reduced-motion → MUI transition süreleri (Adım 4.1)
// =========================================================================

/** SSR-safe `prefers-reduced-motion: reduce` kontrolü. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** `theme.transitions.duration` için — reduced-motion aktifse tüm süreler 0
 * olur (MUI'nin kendi `transitions.create()` çıktısı da 0ms üretir). Aktif
 * DEĞİLSE `undefined` döner; `createTheme()` kendi varsayılanlarını kullanır. */
export function motionDurationOverrides():
  | {
      shortest: number;
      shorter: number;
      short: number;
      standard: number;
      complex: number;
      enteringScreen: number;
      leavingScreen: number;
    }
  | undefined {
  if (!prefersReducedMotion()) return undefined;
  return {
    shortest: 0,
    shorter: 0,
    short: 0,
    standard: 0,
    complex: 0,
    enteringScreen: 0,
    leavingScreen: 0,
  };
}
