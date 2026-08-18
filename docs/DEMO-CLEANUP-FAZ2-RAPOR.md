# Dispatcher Demo Temizliği — Faz 2 Raporu

**Tarih:** 2026-08-19  
**Taban:** `4ea0cbe` (forgot-password UI)  
**PUSH:** yok — insan onayı bekleniyor.

---

## Adımlar ve commit hash’leri

| Adım | Commit | Mesaj |
|---|---|---|
| 1 Landing | `3b9f0ed` | refactor(routing): varsayilan landing live-fleet-map — analytics kancalari cozuldu |
| 2 B listesi | `778bd86` | chore(cleanup): B-listesi — 21 demo sayfa kaldirildi (envanter hukmu) |
| 3 C hükümleri | `4ef5a92` | chore(cleanup): C-hukumleri — analytics + demo auth + yetim settings; 2FA yakinda-rozetli |
| 4 Sidenav | `c09333d` | refactor(nav): demo cekmecesi kaldirildi — Abonelik+Supervizor ana menude |
| 5 Chrome | `ae1e8a8` | content(chrome): Creative Tim linkleri TulipFleet'e — buy-now kalkti |
| 6 examples yetim | `34723e3` | chore(cleanup): examples yetimleri — grep-kanitli ikinci tur |
| 7 Asset yetim | `5a9110f` | chore(assets): kanitli yetim gorseller kaldirildi (~4.5MB repo) |
| 8 Paket | `ca259b9` | chore(deps): html-react-parser kaldirildi — tek kullanicisi demo kanban idi |

Korunanlar bu turda dokunulmadı: `subscription/`, `supervisor/`, `config/api.ts`, `BasicLayout`, `sign-in/basic`, `forgot-password`, `bg-sign-in-basic.jpeg`, `tulipfleet-logo.png`, `DataTable`, `Timeline*`, `DefaultNavbar`, `PageLayout`, `pages/account/settings` + `components`, canlı examples chrome, `public/screenshots/mobile`, `public/` CRA kabuğu, `@asseinfo/react-kanban`.

---

## Adım 1 — Auth-guard

Oturumsuz kullanıcı `App.tsx` catch-all’a **hiç girmez**: `index.tsx` AuthGate, `isAuthenticated === false` iken forgot-password hariç her path’te `sign-in/basic` basar.

- `/` (oturumsuz) → login (Basic). Bozulma yok.
- Login başarı → `navigate("/dashboards/live-fleet-map")`.
- Oturumlu `/` veya bilinmeyen rota → catch-all → `/dashboards/live-fleet-map`.
- Sidenav/Breadcrumbs `to="/"` aynı catch-all’a düşer (dokunulmadı).

---

## Bundle (gzip)

`GENERATE_SOURCEMAP=false`, `npm run build` (Faz-2 HEAD).

| | Dosya | gzip |
|---|---|---|
| **SONRA (Faz-2)** | `build/static/js/main.b2d2399b.js` | **476.65 kB** |
| **SONRA** | `build/static/css/main.1f7b280e.css` | **8.98 kB** |
| ÖNCE | — | Faz-1 yalnızca `tsc-0` kaydetti; üretim gzip tabanı yok. `4ea0cbe` üzerinde ayrı `npm run build` ile kıyaslanabilir. |

Build çıktısı: **Compiled with warnings** (önceden var olan `react-hooks/exhaustive-deps` + LiveFleetMap `no-useless-escape`). Yeni kırılma yok. `CI=true` bu eski uyarıları error sayar; yerel build CI’siz başarılı.

---

## Doğrulama

### tsc

```
npx tsc --noEmit
exit code: 0
```

Faz-1 baseline ile aynı: **tsc-0 (2026-08-19)**.

### Kırık referans grep (src `*.ts`/`*.tsx`)

Hepsi **0 dosya:** `layouts/ecommerce`, `layouts/applications`, `layouts/dashboards/analytics`, `layouts/dashboards/sales`, `CoverLayout`, `IllustrationLayout`, `sign-in/cover`, `html-react-parser`, `pages/profile`, `pages/widgets`, `pages/rtl`, `pages/charts`, `pages/notifications`, `pages/pricing-page`, `BookingCard`, `SalesTable`.

### Smoke (statik kanıt — gerçek OTP/login insan)

| Kapı | Sonuç |
|---|---|
| Login | AuthGate → `layouts/authentication/sign-in/basic`. `useAuthStore.login` aynı. |
| Şifremi unuttum | Login’de link; AuthGate path `/authentication/forgot-password`; BasicLayout + `bg-sign-in-basic.jpeg`. |
| live-fleet-map landing | Catch-all + login `navigate` → `/dashboards/live-fleet-map`. Sidenav Grup 1. |
| `/dispatcher/tasks/optimize` | Gizli rota duruyor. `Board` from `@asseinfo/react-kanban` duruyor. |
| `/subscription` | Yönetim grubu, ana menü. `ENTERPRISE_API_URL` quota/requests. |
| `/admin/supervisor` | Yönetim grubu, ana menü. `SupervisorGate` duruyor. b2b-api ve customer-detail menüsüz rota. |

---

## Adım 6 grep özeti (examples)

Canlı import **0** (examples/ dışı): Charts/**, BookingCard, MasterCard, PricingCards, ProfilesList, Calendar, SalesTable; ayrıca ControllerCard, InfoCards, ProjectCards, BlogCards, Mini/DefaultStatisticsCard, CategoriesList.

**Kaldı:** ComplexStatisticsCard, DefaultItem, Timeline*, DataTable, NotificationItem, Breadcrumbs, DashboardLayout/Navbar, Sidenav, Configurator, Footer, PageLayout, DefaultNavbar.

---

## Adım 7 asset

43 dosya, her biri `src/*.ts(x)` grep=0. `public/favicon.png` ve `public/apple-icon.png` duruyor.

## Adım 8 paket

`npm uninstall html-react-parser` → `package.json` + lock’tan silindi (75 satır lock). `react`/`react-dom` **18.2.0** pin’i korundu. `@asseinfo/react-kanban` duruyor.

---

**PUSH YOK.**
