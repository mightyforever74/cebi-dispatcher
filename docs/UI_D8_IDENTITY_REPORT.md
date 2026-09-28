# UI D8 — Kimlik sidenav, ack kalıcılığı, Optimize mock, e-posta, attribution

Dal: `ui-d8-identity` · Taban: main `4df8189` · Tarih: 2026-09-27  
Yerel bundle: `main.3c88468d.js` **539.31 kB** gzip / CSS `main.c3bdafab.css` 10.26 kB.  
Deployments commit **`da10b0c`** (Pages hash yerel hash’ten farklıdır). Preview CNAME: Cem.

`SUPERVISOR_API_URL` varsayılanı **`https://api.tulipfleet.com`** (Ortam Matrisi: tüm satırlar prod). Üç değişken ayrı durur.

---

## B) Kimlik — sidenav başlığı (navbar bloğu kalktı)

Kaynak aynı: `useUserProfile` → `GET ${AUTH_API_URL}/api/user/profile`.  
Görünüm: `useIdentityDisplay()` (`src/hooks/useIdentityDisplay.ts`) — sidenav + hesap menüsü.

Yer: `SidenavIdentity` logo / “TulipFleet Dispatcher” satırının **hemen altında**, `Divider` öncesi.

| Durum | Birincil satır | İkinci satır | Meta |
|---|---|---|---|
| ad+soyad var | ad soyad | e-posta (küçük) | `nav.role.*` · şirket |
| ad yok | e-posta | — | rol · şirket |
| **404** | JWT `email` | — | JWT rol · `—` |

| Kural | Uygulama |
|---|---|
| Renk | `landing.offwhite` / `landing.navyFog` navy zeminde; `whiteSidenav`’da `navyFog700`. Hex yalnız `tokens.ts`. |
| Kontrast | offwhite `#f8fafc` ve navyFog `#c5cde3` on navyInk `#070b18` — her iki tema sidenav zemini navy (SidenavRoot); ≥4.5:1. |
| Uzun e-posta | `noWrap` + `ellipsis` + `title` |
| Mini (≥xl, 96px) | metin gizli; `account_circle` + Tooltip `e-posta · rol · şirket`; aria e-posta **tek** (`nav.identityAriaEmail`) |
| 390 drawer | metin görünür (250px kâğıt) |
| Navbar | kimlik bloğu **yok**; Hesap menüsünde aynı üç satır durur |

`demo@tulipfleet.com`: profil 200, ad/soyad boş → birincil `demo@tulipfleet.com`, meta TR **Şirket yöneticisi · Dobbe Transport**. Navbar sağında yalnız avatar.

JPEG (q80, ≤150 KB):

| Dosya | KB | Ne |
|---|---|---|
| `docs/screenshots/d8/sidenav-identity-light-1280.jpg` | 74.4 | 1280 light, kimlik logo altında |
| `docs/screenshots/d8/sidenav-identity-dark-1280.jpg` | 67.1 | 1280 dark |
| `docs/screenshots/d8/sidenav-identity-mini.jpg` | 49.2 | mini ray, yalnız ikon |
| `docs/screenshots/d8/sidenav-identity-390.jpg` | 39.6 | 390 açık drawer |
| `docs/screenshots/d8/navbar-390.jpg` | 69.5 | önceki tur (navbar menü özeti) |
| `docs/screenshots/d8/sidenav-mini-titles-light.jpg` | 98.3 | D8-fix mini, başlık yok (ayraç) |
| `docs/screenshots/d8/sidenav-mini-titles-dark.jpg` | 87.4 | D8-fix mini dark |

Rol anahtarları: `nav.role.company_admin` / `super_admin` / `driver`.  
`nav.identityAria`: `{name}, {email}, {role}, {company}` (ad varken).  
`nav.identityAriaEmail`: `{email}, {role}, {company}` (ad yok — e-posta tek). Mini Tooltip: `email · meta`.

---

## D8-fix) Mini sidenav başlık + kimlik tooltip

Mini’de bölüm başlıkları (`OPERASYON MERKEZİ` …) `OPE…` ellipsis yerine **gizli**; yerinde ince `Divider` (96px ray, 7 ayraç). 390 drawer başlıkları durur.

`demo@` mini: aria `demo@tulipfleet.com, Şirket yöneticisi, Dobbe Transport`; Tooltip `demo@tulipfleet.com · Şirket yöneticisi · Dobbe Transport`.

axe Live map light/dark **0/0**. `verify:i18n` 605 keys.

`dispatcher-preview` bu turda hâlâ `main.cc9d4693.js` (eski navbar kimlik; `SidenavIdentity` yok). Cloudflare dash oturumu yok; CNAME Cem.

---

## B2) Notifications ack — Ctrl+F5

### Kaynak (önce okundu)

| Uç | Nerede | Ne |
|---|---|---|
| Feed | `useAlerts.ts` | `GET ${AUTH_API_URL}/api/alerts` |
| Banner | `useNotifications.ts` | açık critical/SOS/`driver_offline` exception + unresolved alert |
| Resolve | `useResolveAlert` | `PUT /api/alerts/:id/resolve` (`is_resolved`) |
| Exception ack | `useExceptions.resolve(..., "acknowledge")` | enterprise exception resolve |
| **`/api/alerts/:id/ack`** | **yok** | core’da ack uç yok |

`localStorage` **`tf.alerts.acked`**: `{ ids: string[], exp: number }`, TTL **7 gün**. X ve Onayla: `banner:*` / `family:*` / `ex:` / `al:` / ham id.

**Not — sunucu ack endpoint’i gerekli.** `PUT /api/alerts/:id/ack` olmadan ack tarayıcıya kilitli.

---

## E) `SUPERVISOR_API_URL` — prod core

Varsayılan: `https://staging-api.tulipfleet.com` → **`https://api.tulipfleet.com`**.  
`REACT_APP_SUPERVISOR_API_URL` hâlâ ezer. AUTH ile aynı host; değişken birleşmedi.

Etkilenen ekranlar (yalnız `src/layouts/supervisor/**`): gate login, şirket listesi, müşteri detayı (approve/reject/quota).

---

## H) Optimize mock uyarısı

`optimize.mockBanner` (EN+TR+NL): HERE Tour Planning yapılmadı; mock seçilen araçları kullanır (`b1374ab`).

---

## Ek) `dispatcher@tulipfleet.nl`

**Kaynak: sabit (FE), DB değil.** `EmailIntegration` boş + `settings.emailPlaceholder` = `info@tulipfleet.com`. Navbar mailto aynı. `src/` içinde `tulipfleet.nl` kalmadı.

---

## Live map dark — attribution kontrastı

Leaflet varsayılanı `rgba(255,255,255,.8)` + `#0078A8` = **1.52:1**.  
`[data-theme="dark"] .leaflet-container .leaflet-control-attribution` (+ `a`):

- zemin: `color-mix(in srgb, var(--tf-navy-elevated) 85%, transparent)` → computed `color(srgb 0.07 0.10 0.20 / 0.85)`
- metin/link: `var(--tf-navy-fog)` → `rgb(197, 205, 227)`

Light kuralı değişmedi. Ek (aynı a11y turu, Live map 0/0 için): boş/yükleme/hata `ListItem` sarması (`ul` yalnız `li`); “Araçlar” CTA rengi `chrome.text` (eskiden `#7C3AED` 2.83:1).

---

## Kanıt

```
npx tsc --noEmit          → 0
npm run i18n:gate         → ok
npm run verify:i18n       → 604 keys en/tr/nl
npm run build             → Compiled successfully
                            main.3c88468d.js  539.31 kB gzip
                            main.c3bdafab.css 10.26 kB
```

axe-core 4.10.3, WCAG 2.1 A/AA, `localhost:3000`, TR, `demo@tulipfleet.com`:

| Ekran | Light crit/ser | Dark crit/ser |
|---|---|---|
| Login | **0 / 0** | **0 / 0** |
| Live map | **0 / 0** | **0 / 0** |
| Tasks | **0 / 0** | **0 / 0** |
| Settings | **0 / 0** | **0 / 0** |

Hex: yeni dosyalarda yok. `SUPERVISOR_API_URL` fallback `api.tulipfleet.com`.

---

## Kapsam dışı

- Core `GET /api/user/profile` prod deploy (bu turda 200; 404 yolu duruyor).
- `PUT /api/alerts/:id/ack` (yok — localStorage geçici).
- `scripts/sim-portxl.js`, `docs/UI_D0_DISCOVERY.md` commit edilmedi.
