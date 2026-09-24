# TulipFleet Dispatcher — D6: Sistemik Onarım + Bundle Diyeti + A11y Son Geçiş

**Branch:** `ui-d6-closeout` (`main` `424aef1` üzerinden)
**Kapsam:** Yeni özellik yok. `[]` tuzağı, breakpoint token, atıl paket/iskelet, skip-link, reduced motion/transparency, kapanış ölçümü.
**Yeni npm paketi:** Yok (yalnız silme).
**Hex:** Yeni literal yok; `breakpoints` `tokens.ts` içinde sayısal.
**Push:** Yok (Cem).

---

## 1. Yönetici özeti

1. **`[]` tuzağı.** React-query `placeholderData` / `queryFn` boş düşüşleri ve `data = []` tüketicileri modül sabiti (`EMPTY_*` / `src/utils/empty.ts`) aldı. `npx eslint src --rule react-hooks/exhaustive-deps:error --quiet` → **0**.
2. **Breakpoint token.** `tokens.breakpoints` = `{ sm:576, md:768, lg:992, xl:1200, xxl:1400 }`. Tema `base/breakpoints.ts` (light+dark) buradan okur. Çıplak `1200` (Sidenav, Configurator, Exceptions ACTION) `breakpoints.xl`. `zIndex: 1200` (Leaflet overlay) kırılım değil, dokunulmadı.
3. **Bundle diyeti.** `@fullcalendar/*`, `@react-jvectormap/*`, `draft-js` ailesi, `chart.js` / `react-chartjs-2`, `dropzone`, `react-images-viewer` kaldırıldı. Import taraması 0 (ölü `MDEditor`/`MDDropzone` silindi). Gzip **önce = sonra = 531.97 kB JS / 10.05 kB CSS / 1 JS chunk** (−0%). CRA zaten import etmeyen paketleri tree-shake ediyordu; kalan ağırlık MD2 çekirdeği (MUI 5 + Leaflet + mqtt + react-table + kanban + CRA).
4. **A11y.** Skip-link ilk a11y kontrolü; `#main-content` `tabIndex={-1}`. Login axe (cdnjs 4.10.3, WCAG 2.1 A/AA) **critical 0 / serious 0 / violations []**. Diğer 7 ekran: oturum `expiresAt=2026-09-22T14:01:48Z` dolmuş — Lighthouse ≥95 ve dark/light axe bu turda ölçülemadi.
5. **Motion / glass.** MUI süreleri zaten `motionDurationOverrides()`; Leaflet `zoomAnimation` / `markerZoomAnimation` `prefersReducedMotion()` ile kapalı. GlassPanel blur/opacity `tokens.glass` + `--tf-glass-*` + `@media (prefers-reduced-transparency: reduce)` → `blur: 0`, opak `0.96`.

---

## 2. Adım A — `[]` taraması ve düzeltmeler

`Select-String -Pattern "= \[\]|= \{\}" -Path src\**` (eşdeğer `Grep`).

### 2.1 Tüketici / hook — sabit referansa çekildi

| Dosya | Satır (önce) | Risk | Düzeltme |
|---|---|---|---|
| `src/hooks/useTasks.ts` | `body.tasks \|\| []` | queryFn boş dizi | `EMPTY_TASKS` + mevcut `placeholderData` |
| `src/hooks/useDrivers.ts` | `body.drivers \|\| []` | aynı | `EMPTY_DRIVERS` + `placeholderData` |
| `src/hooks/useVehicles.ts` | `body.vehicles \|\| []` | aynı | `EMPTY_VEHICLES` + `placeholderData` |
| `src/hooks/useAlerts.ts` | `[]` / `catch (() => ({}))` | queryFn + mutation | `EMPTY_ALERTS` / `EMPTY_OBJECT` |
| `src/hooks/useExceptions.ts` | `data.exceptions \|\| []`, `catch (() => ({}))` | fetch fallback | `EMPTY_EXCEPTIONS` / `EMPTY_OBJECT` |
| `src/hooks/useFleetSnapshot.ts` | `data.locations \|\| []` | poll | `EMPTY_ARRAY` |
| `src/hooks/useDispatchLocationSnapshot.ts` | `body.locations : []` | queryFn | `EMPTY_ARRAY` |
| `src/hooks/useActiveRoutes.ts` | `data.routes \|\| []` | poll | `EMPTY_ARRAY` |
| `src/hooks/useComplianceAssessment.ts` | `data.results ?? []`, `: {}` | queryFn | `EMPTY_ARRAY` / `EMPTY_OBJECT` |
| `src/hooks/useUserAccount.ts` | `catch (() => ({}))` | mutation | `EMPTY_OBJECT` |
| `src/hooks/useGeocodeSearch.ts` | `\|\| []` / `setResults([])` | setState | `EMPTY_ARRAY` |
| `src/hooks/useDriverIndex.ts` | `data.drivers \|\| []` | setState | `EMPTY_ARRAY` |
| `src/layouts/dispatcher/drivers/index.tsx` | `data: vehicles = []` | **useMemo dep** | `EMPTY_VEHICLES` |
| `src/layouts/dispatcher/tasks/optimize/index.tsx` | `data: vehicles = []`, `?? []` prop | useMemo / assess prop | `EMPTY_VEHICLES` / `EMPTY_ARRAY` |
| `src/examples/Navbars/DashboardNavbar/index.tsx` | `alertsData \|\| []` | her render | `EMPTY_ALERTS` |
| `src/components/Notifications/useNotifications.ts` | `alertsData ?? []` | useMemo | `EMPTY_ALERTS` |
| `src/components/GlassPanel/index.tsx` | `ownerState = {}` | styled default | `EMPTY_OBJECT` |
| `src/components/MDBadgeDot/index.tsx` | `font = {}` | default param | `EMPTY_OBJECT` |

### 2.2 Bilinçli bırakılan (hook dep / prop değil)

| Dosya | Neden |
|---|---|
| `page.routes.tsx:10` `= []` | Modül sabiti |
| `tasks/vehicles/drivers` `EMPTY_* = []` | Modül sabiti |
| `exceptions/index.tsx` `parts = []` | Fonksiyon-içi biriktirici |
| `useNotifications` `incoming = []` | Effect-içi biriktirici |
| `optimize` `map = {}`, `badges = []`, 409 `body = {}` | Yerel / bir-kez parse |
| `DataTable` `style = {}` | Satır-içi stil nesnesi |
| `useFleetSnapshot` `record = {}` | Bir fetch kaydı |
| `Footer.defaultProps = {}` | Modül |
| `subscription` / `supervisor` `data.requests \|\| []` | Tek seferlik `setState` |
| `DefaultNavbar` `resultArray[i] = []` | Chunk üretimi (demo navbar) |

### 2.3 ESLint

```
npx eslint "src/**/*.{ts,tsx}" --rule "react-hooks/exhaustive-deps: error" -f unix --quiet
→ exit 0
```

D5 #185 korundu: DataTable `setPageSize` yalnız `pageSize !== next` iken çağrılır.

### 2.4 Breakpoints

`src/assets/theme/tokens.ts`:

```ts
export const breakpoints = { sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400 } as const;
```

Bağlanan çıplak pikseller: `Sidenav` / `Configurator` `window.innerWidth ? breakpoints.xl`; Exceptions `theme.breakpoints.down(breakpoints.xl)`.

---

## 3. Adım B — Bundle diyeti

### 3.1 Import taraması (silme öncesi)

| Paket | `src` import |
|---|---|
| `@fullcalendar/*` | **0** |
| `@react-jvectormap/*` | **0** (yalnız `src/types/react-jvectormap.d.ts`) |
| `chart.js` / `react-chartjs-2` | **0** |
| `draft-js` / `draft-convert` / `react-draft-wysiwyg` | yalnız `components/MDEditor` (hiçbir layout import etmiyor) |
| `dropzone` | yalnız `components/MDDropzone` |
| `react-images-viewer` | **0** (yalnız `.d.ts`) |

### 3.2 Silinen

- npm: yukarıdaki paketler + `@types/draft-*` / `@types/dropzone` / `@types/react-draft-wysiwyg`
- `src/components/MDEditor/**`, `src/components/MDDropzone/**`
- `src/types/react-jvectormap.d.ts`, `src/types/react-images-viewer.d.ts`
- Settings ölü iskelet: `Authentication/index.tsx`, `BasicInfo/data/selectData.ts`
- Diskte boş MD2 dizinleri (`layouts/dashboards|applications|ecommerce|…`) `Remove-Item` — git’te yoktu

React **18.2.0** pin korundu (`npm uninstall` bir an `>=16.8.0` yazdı, geri alındı).

### 3.3 Build gzip

| | Önce | Sonra | Δ |
|---|---|---|---|
| JS | `main.184a5000.js` **531.97 kB** | aynı hash **531.97 kB** | **0%** |
| CSS | `main.4a16a387.css` **10.05 kB** | **10.05 kB** | 0 |
| JS chunk | 1 | 1 | 0 |

≥%10 düşüş **yok**. Sebep: paketler uygulama grafiğinde değildi; webpack onları zaten atmıyordu. Kalan ~532 kB = MD2/MUI + Leaflet + mqtt + react-query + react-table + `@asseinfo/react-kanban` + CRA runtime. Daha büyük kesim code-split / MD2 çekirdek değişimi ister (bu paketin kapsamı değil).

### 3.4 `npm ci`

`node_modules/.cache` (çalışan CRA kilidi) temizlendikten sonra: **exit 0**, 1605 paket.

---

## 4. Adım C — A11y

### 4.1 Skip-link

- `src/index.tsx` `SkipLink` — AuthGate’in ilk çocuğu (login + App).
- `href="#main-content"`; i18n `common.skipToMain` (EN/TR/NL).
- `DashboardLayout` + `PageLayout`: `component="main"` `id="main-content"` `tabIndex={-1}`.
- Login `BasicLayout` iç içe `main` kaldırıldı.
- CDP: `a.click()` → `location.hash === "#main-content"` ve `document.activeElement.id === "main-content"`.
- CSS: gizlenmiş; `:focus-visible` ile sabit sol-üst marka düğmesi (`--tf-brand-primary`).

### 4.2 Lighthouse / axe (8 ekran)

| Ekran | Light axe | Dark axe | LH a11y |
|---|---|---|---|
| Login | **0 / 0** (critical/serious) | aynı kabuk (tema `data-theme`) | oturum yok; LH paketi eklenmedi |
| Live map, Tasks, Drivers, Vehicles, Exceptions, Optimize, Settings | **ölçülemedi** — `dispatcher-auth` süresi dolmuş | aynı | aynı |

Login `axe.run` (WCAG 2.1 A/AA): `violations: []`. Moderate kalan: yok (bu yüzeyde).

### 4.3 Reduced motion / transparency

| Katman | Kanıt |
|---|---|
| MUI transitions | `tokens.motionDurationOverrides()` → `theme/index.ts` + `theme-dark/index.ts` süre 0 |
| Global CSS | `@media (prefers-reduced-motion: reduce)` `transition/animation` 0.01ms |
| Leaflet | `MapContainer zoomAnimation={!prefersReducedMotion()}` + `markerZoomAnimation` |
| Cluster CSS | reduced-motion altında `transition: none` |
| Glass | `--tf-glass-blur: 0px` + GlassPanel `@media (prefers-reduced-transparency: reduce)` opak `glass.reducedOpacity` |

---

## 5. Commitler

| # | Hash | Konu |
|---|---|---|
| 1 | `3ddcaaf` | boş referans + breakpoints token |
| 2 | `63d9f75` | paket diyeti + ölü sarmalayıcı/iskelet |
| 3 | `0defbd6` | skip-link, axe login 0, reduced motion/glass |
| 4 | bu dosya | `docs/UI_D6_REPORT.md` |

Seri özeti + D7 arşiv ayrı commit (`docs/UI_SERIES_SUMMARY.md`).
