# TulipFleet Dispatcher — D4: Veri Yüzeyleri

**Branch:** `ui-d4-data` (`ui-d3-livemap` üzerinden — D3 henüz `origin/main`'e merge edilmedi)
**Kapsam:** Tasks, Drivers, Vehicles, Exceptions liste ekranları + `StatusChip`, `DataTable`, `DataState`, `Notifications`. Task detail / Optimize / modallar **dışarıda** (D5).
**Yeni npm paketi:** Yok.
**Hex literal:** JS/TS kaynakta yalnız `src/assets/theme/tokens.ts`.

---

## 1. Yönetici özeti

1. **StatusChip tek kaynak.** `kind: task | alert | vehicle | exception` + `tokens.status.*`. D0 C1'deki dört `statusColor` / `SEVERITY_COLOR` switch-case silindi. `Select-String` `case 'in_progress'|case "in_progress"` → **0**. Bilinmeyen değer nötr çip + ham etiket + `console.warn` (boş asla).
2. **DataTable disiplini.** MD2 react-table üstünde sarmalayıcı: gerçek `<table>/<tr>/<th>/<td>` (axe `columnheader` ebeveynsiz kapanır), `aria-sort`, arama `label`, density `compact` 40 / `comfortable` 56 (`localStorage tf.density`, navbar hesap menüsü), sayı sağa + `tabular-nums`, tarih/sayı `formatDate` / `formatNumber` (NL `dd-mm-yyyy`, virgül ondalık). Taşma: `minWidth`/`maxWidth`/`truncate`, TASK `flex:1` + ellipsis + `title`, konteyner `overflow-x:auto` + gölge ipucu. `<md`: kart (3 birincil sütun). Boş hücre `—`.
3. **DataState.** `loading` (başlık kalır, skeleton satır), `empty` + ikon + sözlük + Tasks CTA → Optimize, `error` + Yeniden dene, `stale` şerit (`formatRelative` + `map.staleMs`, D3 rozeti ile aynı eşik). Dört liste ekranı bağlı (`isLoading` / `isError` / `dataUpdatedAt` veya `lastOkAt`).
4. **İkaz hiyerarşisi.** Banner = `critical` / SOS / `driver_offline` (sayfa üstü, kapatılana kadar). Toast = geofence / hız / `task_*` (MDSnackbar, en fazla 3, aynı tür 10 sn içinde `×N`). Kaynak tek: `useNotifications` ← FEAT-010 `useExceptions` + `useAlerts`. Banner'dan **Onayla**. Ses yok. `prefers-reduced-motion` → toast `transitionDuration: 0` (global.css zaten animasyonu sıfırlar).

---

## 2. D0 / D2 / D3 kapananlar

| Bulgu | Durum |
|---|---|
| D0 C1 — 4 ayrı status switch-case | `StatusChip`; `case "in_progress"` **0** |
| D0 C2 — DataTable disiplini | `src/components/DataTable` |
| D0 B4 — MDSnackbar kullanılmamış | Toast kuyruğu `MDSnackbar` |
| D2 §7 — Tasks yatay taşma 2013/934px | `table-layout:fixed` + truncate + overflow gölgesi; 7 sütun minWidth toplamı ~730px + padding |
| D2 §7 — axe `columnheader` ebeveynsiz ×7 | `TableHead` + `th[scope=col][role=columnheader]` içinde `role=row` |
| D2 §7 — search label, list/checkbox | Arama `label` + `aria-label={table.searchAria}`; Autocomplete `label` |
| D3 status token + `formatRelative` | Chip renkleri token; stale şerit aynı helper / `map.staleMs` |

---

## 3. Adım kanıtları

### 3.1 StatusChip

- Dosya: `src/components/StatusChip.tsx`. Vehicle kind paleti `status.vehicle` + `status.driver` + `status.vehicleOps` (5. kind yok). Listede `maintenance` = vehicleOps (warning); haritada connectivity `maintenance` = secondary (D3, değişmedi).
- Sözlük: `status.<kind>.<value>` EN/TR/NL. `PriorityChip` ayrıca `status.priority.*`.
- Ekranlar: Tasks `kind="task"` + `PriorityChip`; Vehicles/Drivers `kind="vehicle"`; Exceptions tip `kind="exception"`, önem `kind="alert"`.

### 3.2 DataTable + density + i18n sayı/tarih

- `src/context/density.tsx` — `tf.density`.
- Navbar hesap menüsü: “Sıkı satırlar” / “Rahat satırlar” (dile göre).
- `formatDate` / `formatDateTime` / `formatNumber` / `emptyDash` — `src/i18n/index.ts`.
- Mobil kart: `primary` sütunlar (yoksa ilk 3).

### 3.3 DataState

- `src/components/DataState.tsx` + `dataStateOf` / `isDataStale`.
- `useExceptions` `lastOkAt` (react-query olmayan poll).
- Tasks empty CTA: `dataState.emptyTasksCta` → `/dispatcher/tasks/optimize`.

### 3.4 Notifications

- `src/components/Notifications/` — `NotificationsProvider` `src/index.tsx` içinde; host `DashboardLayout` (giriş ekranında banner yok).
- Exceptions listesi aynı kuyruktan (`useNotifications`), çift poll yok.
- Dev-only: `window.__tfToastStorm()` — 10 ikaz (5 geofence + 5 speed) → en fazla 3 toast + birleşme `×N`.

---

## 4. Doğrulama

| Kontrol | Sonuç |
|---|---|
| `case 'in_progress'` / `case "in_progress"` | **0** (`src` tarama) |
| Hex grep liste ekranları + yeni bileşenler | **0** (`tasks/optimize` D5, bu pakette değil) |
| `npx tsc --noEmit` | **0 hata** |
| `npm run build` | gzip **521.47 kB** `main.*.js` (**+12.35 kB**), CSS 10.05 kB |
| CRA overlay | derleme uyarı: yalnız önceden var olan `DashboardLayout` `dispatch` exhaustive-deps |
| axe Tasks/Drivers/Vehicles/Exceptions critical/serious | **Oturum düştü** — login otomasyonu bu turda onaylanmadı; tablo rolleri kodda doğru hiyerarşi. Canlı axe Cem oturumu ile. |
| Lighthouse a11y ≥ 95 (Tasks) | Aynı neden; kod: search label, `aria-sort`, `role=table/row/columnheader/cell` |
| Tasks 1280 `scrollWidth ≤ clientWidth` | Kod: `table-layout:fixed; width:100%` + sütun min/max. DevTools ölçümü oturum gerektirir. |
| 390px kart / 3 sütun | `breakpoints.down("md")` kart görünümü |
| StatusChip aynı değer = aynı renk | Tek `resolveStatusColors` |
| Bilinmeyen `rule_violation` | Nötr `status.unknown` + ham etiket + `console.warn` |
| Toast storm | `__tfToastStorm()` (dev) |
| Push | **Yok** (Cem) |

### Tarayıcı notu

Yerel CRA (`localhost:3000`) ayaktaydı; dispatcher oturumu süresi dolmuştu (login formu). Demo giriş tıklaması otomasyon politikası tarafından reddedildi. Liste ekranı JPEG kolajı / axe / Lighthouse bu yüzden rapora gömülmedi — kod ve derleme kanıtı yukarıda. Canlı oturumda: Tasks → 1280 genişlik + console `table.scrollWidth` / `clientWidth`; 390 emülasyon; Network offline ile DataState 4×4; `__tfToastStorm()`.

---

## 5. Commit'ler (push yok)

1. StatusChip + tokens + i18n status/density/dataState/notify
2. DataTable + density context + navbar anahtarı
3. DataState + dört liste ekranı + `useExceptions.lastOkAt`
4. Notifications (banner/toast) + provider
5. Bu rapor

Kapsam dışı bırakıldı: `scripts/sim-portxl.js`, `docs/UI_D0_DISCOVERY.md`, Optimize/task detail/modallar.

---

## 7. Preview turu + fix (bundle 4f90f648)

Kaynak: D4 preview. Yeni paket yok. Push yok.

### 7.1 Error yolu (gerçek bug)

React Query `networkMode: "online"` (varsayılan) DevTools Offline’da sorguyu **pause** eder: `isError=false`, `isLoading=false`, `data=undefined` → `[]` → `DataState.empty`.

Düzeltme:
- `dataStateOf`: **önce `isError`**, sonra loading, sonra empty.
- `listFetchState`: `isError || error || (isPaused && data yok)`.
- Empty yalnız `data !== undefined && data.length === 0 && !isError`.
- `useTasks` / `useVehicles` / `useDrivers`: `networkMode: "always"` — offline fetch hata verir; Retry online’da `refetch()` çalışır.

Kanıt (Cem oturumu): DevTools Offline → “Could not load data” + Retry; Online → Retry listeyi getirir.

### 7.2 Banner

- DOM: `DashboardNavbar` içinde AppBar **altında** (`<main>` başı, sayfa sonu değil).
- Aynı `family` birleşir (`Driver offline ×3`).
- En fazla **2** banner + `{n} daha → Exceptions`.
- Her banner: Kapat (oturum `dismissed` + `family:*`) ve Onayla (exception `resolve` + telemetry `useResolveAlert`).
- SOS metni `notifications.sos.*` (TR “Görev”, ham “Gorev” yok).
- Live map: `position:fixed; top: 64px` opak şerit — harita flex yüksekliği değişmez.

### 7.3 Yoğunluk

Hücreler tek satır: görev `no — title` ellipsis + `title`; rota tek satır tooltip; tarih `formatDateTime` (`hourCycle: h23` → `dd-mm-yyyy HH:mm`). `tr` / `td` `height` + `maxHeight` = `rowPx` (compact 40 / comfortable 56).

### 7.4 Enum etiketleri

- `vehicle.category.{truck_heavy,truck_medium,van}`
- `vehicle.fuel.{diesel,gasoline,electric,hybrid,lpg}`
- `status.exception.rule_violation` (+ mevcut 6 tip)

Ham değer yalnız sözlükte olmayanlarda. **Hâlâ ham (kapsam dışı / rapora):** `emission_class` (`zero_emission`, `euro_6*`, …), Optimize/dialog çözüm aksiyonları (D5).

### 7.5 Light kontrast + a11y küçükler

- `landing.navyFog700 = #64748b` (landing `--color-roadmap`; landing’de navyFog-700 yok). `paletteLight.textMain` / `secondaryMain` buradan — offwhite üstü ≥ 4.5:1.
- Navbar `h1` 390px: `nav.short.*` + `font-size: 1rem`.
- Liste başlıkları `component="h3"` (önce h5).
- Tablo sarmalayıcı `tabIndex={0}` `role="region"` `aria-label`.
- Pagination / navbar / breadcrumb `Icon aria-hidden`; `table.prevPage` / `nextPage`.

Hedef: axe Tasks/Vehicles color-contrast 0, Lighthouse a11y ≥ 95 (canlı oturum).

### 7.6 D4-fix-2 (preview sonrası)

- **Error kopyası:** dört listede başlık `dataState.error.title` (“Could not load data”); `error.message` yalnız caption + “Ayrıntı” toggle (`dataState.error.detail`; prod kapalı, dev açık). Ham `Error: Failed to fetch` başlık değil.
- **Light kontrast** (`tokens.ts`; `paletteDark` dokunulmadı):

  | Token | Eski → yeni | Zemin | Oran (WCAG 2.1) |
  | --- | --- | --- | --- |
  | `badgeColors.info.text` (status mavi çip `fg`) | `#095bc6` → `#074a9e` | `#aecef7` | 3.90 → **5.23:1** |
  | `badgeColors.error.text` (critical banner `fg`) | `#f61200` → `#c1170a` | `#fcd3d0` | 3.07 → **4.53:1** |
  | `landing.navyFog700` (input label / ikincil metin) | `#64748b` → `#5b6577` | `#f0f2f5` | 4.24 → **5.24:1** |
  | `paletteLight.infoMain` (link caption) | `#1a73e8` → `#155fc0` | `#f0f2f5` | 4.02 → **5.46:1** |

  Dark kanıt: `paletteDark.badgeColors.info/error.text` hâlâ `#095bc6` / `#f61200`; `paletteDark.infoMain` hâlâ `#1A73E8`.
- **heading-order ×1:** navbar `h1` sonrası sayfa başlığı `h3` idi (h2 atlanıyordu). Dört listede `component="h2"` (görsel `variant="h5"` aynı).
- Build gzip **523.17 kB** (+158 B).

