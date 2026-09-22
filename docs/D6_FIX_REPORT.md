# TulipFleet Dispatcher — D6-FIX

**Branch:** `ui-d6-closeout`
**Kapsam:** axe serious=0, i18n sizintisi, 390px banner. Yeni ozellik yok.
**Hex:** yalniz `src/assets/theme/tokens.ts`. Metin: `src/i18n/{en,tr,nl}.ts` (+ `backendCopy.ts` backend TR prefix eslemesi).
**Yeni npm paketi:** Yok.
**Bundle:** `main.0416b55d.js` → **`main.0a1b7136.js`** (535 kB gzip JS / 10.2 kB CSS). Deployments alias: `ui-d6-closeout` push.

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

## D7 notu

1045px sidebar + banner ortusmesi bu turda yok. Banner wrap / DISMISS / birincil kontrol (NEW TASK, Search plate) ≤992 kanitlandi.
