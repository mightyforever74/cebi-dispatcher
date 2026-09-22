# TulipFleet Dispatcher — D6-FIX

**Branch:** `ui-d6-closeout`
**Kapsam:** axe serious=0, i18n sizintisi, 390px banner. Yeni ozellik yok.
**Hex:** yalniz `src/assets/theme/tokens.ts`. Metin: `src/i18n/{en,tr,nl}.ts` (+ `backendCopy.ts` backend TR prefix eslemesi).
**Yeni npm paketi:** Yok.
**Bundle:** `main.0416b55d.js` → yerel `main.0a1b7136.js` (535 kB gzip JS / 10.2 kB CSS). Deployments commit `71a64d2`; Pages hash yerel hash'ten farklıdır.

---

## 1. Login — gradient fallback + light kontrast

`BasicLayout` gradient kutusuna `backgroundColor: landing.navyInk` (gradient `backgroundImage` altinda). Footer ayni token ile zemin alir; © / Privacy / Terms / v1.0.2 `landing.offwhite` / `landing.navyFog` artik navy uzerinde olculur (offwhite/navyInk **18.76**, navyFog/navyInk **12.35**).

Forgot password: `landing.emerald` (beyaz kartta **2.54**) → `a11y.linkLight` / `a11y.linkDark` (beyazda **6.12**, dark kartta **8.10**).

---

## 2. Live map liste + Polling / N active

`Paper` sarmalayici kaldirildi. `List` (`ul`) dogrudan `ListItem` (`li`) cocuklari alir — karisik `component="div"` yok.

**Yeni token:** `map.dark.textOnChip` / `map.light.textOnChip`

| Tema | Deger | Yuzey | Oran |
|---|---|---|---|
| dark | `paletteDark.white` `#ffffff` | `chipBg` `landing.navyDeep` | 18.32 |
| light | `paletteLight.darkMain` `#344767` | `chipBg` `grey.200` | 8.35 |

`ConnectionBadge` (Polling) ve "N active" Chip `chrome.chipBg` + `chrome.textOnChip`. `textMuted` / `text.secondary` kullanilmiyor.

---

## 3. StatusChip pending / in_progress

Sozluk dokunulmadi. Yalniz `tokens.status.task`:

| Durum | Once (oran) | Sonra | Oran |
|---|---|---|---|
| pending | `#6c757d` / `#d7d9e1` (3.33) | fg `paletteLight.grey[800]` `#343a40` / ayni bg | 8.16 |
| in_progress | `#cc084b` / `#f8b3ca` (3.32) | fg `#6d0830` / ayni bg | 7.11 |

Cip kendi bg/fg ciftinde; her iki temada ayni cift ≥4.5.

---

## 4. Drivers LinearProgress

`aria-label={t("drivers.progressLabel")}`. TR mevcut etiket: **"Guvenlik skoru"** (`drivers.colSafety` ile ayni metin). EN "Safety score", NL "Veiligheidsscore".

---

## 5. i18n sizintisi + karakter kapi

- Toast `Görev kabul edildi: …` → `notify.taskAccepted` (`{detail}`). Backend TR prefix `src/i18n/backendCopy.ts` icinde kalir; `localizeBackendAlert` toast + navbar hot-alert.
- Subscription "Mevcut filo kotanizi goruntule…" → `plan.subtitle` (tum sayfa `plan.*` / `connect.*`).
- Supervisor / Toll placeholder / `conflict.fallback` sozluge cekildi.

**Kapi:** `src/**/*.ts(x)` icinde `src/i18n/` haric Turkce harf sifir.

```
rg -n -g "*.ts" -g "*.tsx" -g "!src/i18n/**" "[ğüşıöçĞÜŞİÖÇ]" src
# (no matches; exit 1 from ripgrep)
```

Yorumlardaki harfler ASCII'ye cevrildi; UI metni sozlukte.

---

## 6. Notifications banner ≤ lg (992) + rota ellipsis

≤ `lg` (992): banner in-flow (live-map `position:fixed` overlay **kapali**), `width:100%`, aksiyonlar `flexWrap`. DISMISS viewport icinde. "+ NEW TASK" ve "Search plate" ortulmez (390px kanit).

≥ lg live-map overlay ayni; **1045 sidebar ortusmesi D7** (bu kapsamda degil).

Rota: Tasks `route_info` `ellipsis` + `title`; DataTable kart degeri `minWidth:0` / `textOverflow`. Kart etiketleri `dialog.*.textMuted` (secondary degil).

---

## 7. Dogrulama

`npx tsc --noEmit` temiz. `npm run verify:i18n` → 599 key. `npm run build` temiz.

axe-core 4.10.3, WCAG 2.1 A/AA. Login / Live map / Tasks / Drivers / Subscription × dark/light.

| Ekran | Once crit/ser | Sonra dark | Sonra light |
|---|---|---|---|
| Login | 0 / contrast risk (footer+forgot light) | 0 / 0 | 0 / 0 |
| Live map | listitem + Polling/N-active contrast | 0 / 0 | 0 / 0 |
| Tasks | pending 3.33, in_progress 3.32; kart caption secondary | 0 / 0 | 0 / 0 |
| Drivers | LinearProgress namesiz | 0 / 0 | 0 / 0 |
| Subscription | hardcoded TR + h6 secondary | 0 / 0 | 0 / 0 |

**390px JPEG q80:** `docs/screenshots/d6fix-tasks-390.jpg` (108632 B), `docs/screenshots/d6fix-livemap-390.jpg` (110167 B). Search plate / + NEW TASK gorunur.

---

## Dokunulan danosanlar

### a11y / token
`src/assets/theme/tokens.ts`
`src/layouts/authentication/components/BasicLayout/index.tsx`
`src/layouts/authentication/components/Footer/index.tsx`
`src/layouts/authentication/sign-in/basic/index.tsx`
`src/layouts/live-fleet-map/LiveFleetMap.tsx`
`src/layouts/live-fleet-map/ConnectionBadge.tsx`
`src/layouts/live-fleet-map/mapChrome.ts`
`src/layouts/dispatcher/drivers/index.tsx`
`src/components/DataTable/index.tsx`
`src/layouts/subscription/index.tsx`
`src/layouts/subscription/b2bApi/index.tsx`

### i18n
`src/i18n/en.ts` `src/i18n/tr.ts` `src/i18n/nl.ts` `src/i18n/index.ts` `src/i18n/backendCopy.ts`
`src/components/Notifications/useNotifications.ts`
`src/examples/Navbars/DashboardNavbar/index.tsx`
`src/layouts/supervisor/index.tsx`
`src/layouts/supervisor/SupervisorGate.tsx`
`src/layouts/supervisor/customerDetail/index.tsx`
`src/layouts/optimization/TollAnalyticsPlaceholder.tsx`
`src/hooks/useTaskOptimization.ts`

Yorum ASCII (kapi): `src/index.tsx`, `src/routes.tsx`, `src/page.routes.tsx`, `src/context/index.tsx`, theme light/dark `base/*` + `stepper/*` + `index.ts`, `src/examples/{Sidenav,Configurator,Footer,Navbars}/**`, `src/hooks/use{ActiveRoutes,DriverIndex,FleetSnapshot,MqttTelemetry,NotificationPreferences}.ts`, `src/components/{BulkConfirmDialog,ConfirmDialogShell,ConflictOverrideModal,FuelGaugeMini}`, `src/layouts/authentication/{BrandBlock,forgot-password}`, `src/layouts/dispatcher/exceptions/index.tsx`, `src/layouts/pages/account/**`, `src/layouts/supervisor/supervisorSession.ts`, `src/services/dispatch/decisionLog.ts`, `src/store/use{RouteLayerStore,VehicleStore}.ts`

### ui
`src/components/Notifications/index.tsx`
`src/layouts/dispatcher/tasks/index.tsx`

### docs
`docs/D6_FIX_REPORT.md`
`docs/screenshots/d6fix-tasks-390.jpg`
`docs/screenshots/d6fix-livemap-390.jpg`

**Dokunulmadi:** `scripts/sim-portxl.js`, `docs/UI_D0_DISCOVERY.md`, `.env`, `.cursorrules`.

---

## 8. Kontrast ekleri (WCAG 2.x relative luminance)

Formul (WCAG 2.2 relative luminance + contrast ratio):

```
sRGB kanal:  C_srgb = C_8bit / 255
dogrusal:    C = C_srgb <= 0.04045 ? C_srgb/12.92 : ((C_srgb+0.055)/1.055)^2.4
L = 0.2126 R + 0.7152 G + 0.0722 B
oran = (L_acik + 0.05) / (L_koyu + 0.05)
esik AA metin: 4.50
```

### (a) Login footer / Forgot + `textOnChip` — kendi yuzeyi, iki tema

Footer zemini her temada `landing.navyInk` (`#070b18`) — light temada da gradient fallback + footer `backgroundColor` ayni token. Forgot kart zemini light `paletteLight.white` (`#ffffff`), dark `paletteDark.backgroundCard` (`#202940`). Chip zemini `map.*.chipBg`.

| Yuzey | Tema | Token (hex) | Zemin (hex) | L_fg | L_bg | Oran |
|---|---|---|---|---|---|---|
| Footer © | light = dark | `landing.offwhite` `#f8fafc` | `landing.navyInk` `#070b18` | 0.9536 | 0.0035 | **18.76** |
| Footer Privacy / Terms / v1.0.2 | light = dark | `landing.navyFog` `#c5cde3` | `landing.navyInk` `#070b18` | 0.6108 | 0.0035 | **12.35** |
| Forgot password | light | `a11y.linkLight` `#155fc0` | kart `#ffffff` | 0.1215 | 1.0000 | **6.12** |
| Forgot password | dark | `a11y.linkDark` `#8EC8F8` | kart `#202940` | 0.5384 | 0.0226 | **8.10** |
| Polling / N active (`textOnChip`) | dark | `paletteDark.white` `#ffffff` | `landing.navyDeep` `#0d1427` | 1.0000 | 0.0073 | **18.32** |
| Polling / N active (`textOnChip`) | light | `paletteLight.darkMain` `#344767` | `grey.200` `#f0f2f5` | 0.0622 | 0.8862 | **8.35** |

Once (Forgot): `landing.emerald` `#10b981` / `#ffffff` = **2.54** (<4.5). Footer light'ta solid fallback yokken axe sayfa `#f0f2f5` uzerinden olcuyordu.

### (b) StatusChip pending / in_progress — dark tema ciftleri

`tokens.status.task` tema-bolunmez (StatusChip `darkMode` okumaz). Dark temada da ayni hex; kontrast cipin kendi `fg`/`bg` ciftidir (sayfa zemini degil).

| Durum | Dark (ve light) fg | Dark (ve light) bg | L_fg | L_bg | Oran |
|---|---|---|---|---|---|
| pending | `#343a40` (`paletteLight.grey[800]`) | `#d7d9e1` (`badge.secondary.background`) | 0.0413 | 0.6951 | **8.16** |
| in_progress | `#6d0830` | `#f8b3ca` (`badge.primary.background`) | 0.0364 | 0.5646 | **7.11** |

Once: pending `#6c757d`/`#d7d9e1` = 3.33; in_progress `#cc084b`/`#f8b3ca` = 3.32.

### (c) Yalniz yorum ASCII — dosya listesi

`a6ccd24` **icinde** (commit'ten cikarilmadi). Runtime / sozluk degismeyen, yalniz `ğüşıöçĞÜŞİÖÇ` → ASCII (yorum / JSDoc / dosya basligi). Gate yorumlari haric tutmaz; harfler ASCII oldugu icin gecer. 45 dosya:

```
src/assets/theme/base/borders.ts
src/assets/theme/base/colors.ts
src/assets/theme/base/globals.ts
src/assets/theme/base/typography.ts
src/assets/theme/components/stepper/stepConnector.ts
src/assets/theme/components/stepper/stepIcon.ts
src/assets/theme/components/stepper/stepLabel.ts
src/assets/theme/index.ts
src/assets/theme-dark/base/borders.ts
src/assets/theme-dark/base/colors.ts
src/assets/theme-dark/base/globals.ts
src/assets/theme-dark/base/typography.ts
src/assets/theme-dark/components/stepper/stepConnector.ts
src/assets/theme-dark/components/stepper/stepIcon.ts
src/assets/theme-dark/components/stepper/stepLabel.ts
src/assets/theme-dark/index.ts
src/components/BulkConfirmDialog/index.tsx
src/components/ConfirmDialogShell/index.tsx
src/components/ConflictOverrideModal/index.tsx
src/components/FuelGaugeMini.tsx
src/context/index.tsx
src/examples/Configurator/index.tsx
src/examples/Footer/index.tsx
src/examples/Navbars/DashboardNavbar/styles.ts
src/examples/Navbars/DefaultNavbar/index.tsx
src/examples/Sidenav/SidenavRoot.tsx
src/examples/Sidenav/index.tsx
src/examples/Sidenav/styles/sidenavCollapse.ts
src/hooks/useActiveRoutes.ts
src/hooks/useDriverIndex.ts
src/hooks/useFleetSnapshot.ts
src/hooks/useMqttTelemetry.ts
src/hooks/useNotificationPreferences.ts
src/index.tsx
src/layouts/authentication/components/BrandBlock/index.tsx
src/layouts/authentication/forgot-password/index.tsx
src/layouts/dispatcher/exceptions/index.tsx
src/layouts/pages/account/components/BaseLayout/index.tsx
src/layouts/pages/account/settings/index.tsx
src/layouts/supervisor/supervisorSession.ts
src/page.routes.tsx
src/routes.tsx
src/services/dispatch/decisionLog.ts
src/store/useRouteLayerStore.ts
src/store/useVehicleStore.ts
```

Ayni commit'te **yorum + kod/sozluk** (bu listede degil): `src/i18n/{en,tr,nl,index,backendCopy}.ts`, `useNotifications.ts`, `DashboardNavbar/index.tsx`, `subscription/{index,b2bApi}`, `supervisor/{index,SupervisorGate,customerDetail}`, `TollAnalyticsPlaceholder.tsx`, `useTaskOptimization.ts`.

---

## D7 notu

1045px sidebar + banner ortusmesi bu turda yok. Banner wrap / DISMISS / birincil kontrol (NEW TASK, Search plate) ≤992 kanitlandi.
