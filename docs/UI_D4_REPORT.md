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
