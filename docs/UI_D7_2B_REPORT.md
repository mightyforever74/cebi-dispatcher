# UI D7-2b — Exceptions CLS (tek kaynak)

Dal: `ui-d7-2b-cls` · Taban: main `1935f0e` · Prod referans: LH Desktop Exceptions **0.160** (`div.MuiBox-root.css-bq11r7`) · Tarih: 2026-09-26

## 1. Teşhis (tahmin yok)

PerformanceObserver `layout-shift` (localhost, oturumlu, TR, buffered). İten öğe LH ile aynı düğüm.

### Kayan öğe

`div.MuiBox-root.css-bq11r7` — “İstisna yönetimi (uyarılar) … Kritik 2 Yüksek …”
Kart/gövde sarmalayıcısı; **yüksekliği değişmedi**.

| | ms | value | selector | önce y / h | sonra y / h | Δy / Δh |
|---|---|---|---|---|---|---|
| Exceptions | **1236.3** | 0.0157 | `div.MuiBox-root.css-bq11r7` | 24 / 540.3 | 88 / 540.3 | **+64 / 0** |
| aynı an | 1236.3 | (aynı) | `div.MuiCard-root` | 43.9 / 508.6 | 107.9 / 508.6 | **+64 / 0** |
| Tasks | (client mount) | 0.0183 | `div.MuiBox-root.css-hwgoop` (Görevler + tablo) | 24 / 650.5 | 88 / 650.5 | **+64 / 0** |
| Drivers | (client mount) | 0.0152 | `div.MuiBox-root.css-hwgoop` (Sürücüler + tablo) | 24 / 528.5 | 88 / 528.5 | **+64 / 0** |

+64 px = `tokens.density.navbar`. MUI `AppBar` `position` ilk karede `undefined` → varsayılan **`fixed`** (akış dışı). `useEffect` `fixedNavbar` (default true) ile **`sticky`** yapıyor → 64 px içeri giriyor. LH Desktop’ta aynı 64 px kayma büyük kutu üzerinde **0.160**.

### Adaylar

| Aday | Karar | Kanıt |
|---|---|---|
| (a) Notifications banner | Bu oturumda **0** `[role=alert]`. Prod’da critical → `NotificationHost` `return null` → in-flow ekleme ikinci kayma olur. | Kod: `visible.length===0 && toasts.length===0` iken host yoktu. Overlay yasak (1045 D7). |
| (b) Başlık / breadcrumb yüksekliği | **Ele.** | `dh = 0`. Metin ilk kayma anında zaten tam. |
| (c) Özet chip satırı | **Ele.** | Kayma anında “Kritik 2 Yüksek” vardı; kutu h 540.3 → 540.3. |
| (d) DashboardNavbar | **Kök neden.** | Δy = 64; AppBar sonra `position: sticky; height: 64`. |

Tasks ikinci kayma (pagination `dy: 280`, 0.018) iskelet 5 → 10 satır; LH düğümü değil. İskelet artık `pageSize`.

## 2. Düzeltme

İlk boya = son yerleşim. Overlay yok.

| Dosya | Ne |
|---|---|
| `DashboardNavbar` | `navbarType` ilk state `fixedNavbar ? "sticky" : "static"` — `fixed` ara karesi yok |
| `tokens.density.banner` | 56; slot `56 × MAX_VISIBLE_BANNERS` (112) |
| `NotificationHost` | Slot her zaman var; `min-height: 112px`, `contain: layout`. Overlay yalnız live-map ≥lg (önceki kural) |
| `Banner` | `minHeight: density.banner - 6` — slot içinde taşmadan oturur |
| Exceptions / Tasks / Drivers başlık | `contain: layout` + `minHeight` (chip/başlık satırı sabit) |
| `DataTable` | Skeleton satır sayısı = `pageSize` |

## 3. Kanıt — sonra

```
AppBar position: sticky  height: 64
[data-banner-slot] minHeight: 112px  height: 112
```

| Ekran | Layout Shift toplamı |
|---|---|
| Exceptions (mount) | **0.0008** (toast; dy 0) |
| Tasks | **0.0000** |
| Drivers | **0.0000** |
| Exceptions (yeniden) | **0.0000** |

Hepsi **< 0.05**. JPEG: `docs/screenshots/d7-2b/cls-after.jpg`.

## 4. Doğrulama

- `npx tsc --noEmit` 0
- `npm run i18n:gate` 0
- `npm run verify:i18n` 599 keys
- `npm run build` temiz; gzip **535.49 kB** `main.f5535b91.js`, CSS 10.2 kB

axe-core 4.10.3 WCAG 2.1 A/AA:

| | light | dark |
|---|---|---|
| Exceptions | 0 / 0 | 0 / 0 |
| Tasks | 0 / 0 | 0 / 0 |
| Drivers | 0 / 0 | 0 / 0 |

Lighthouse’u Cem koşar.

## Kapsam dışı

- 1045 sidebar + banner örtüşmesi (overlay değil; D7 listesi)
- Live-map overlay banner (in-flow değil)
- `scripts/sim-portxl.js`, `docs/UI_D0_DISCOVERY.md`
