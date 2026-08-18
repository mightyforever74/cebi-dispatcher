# Dispatcher Demo Temizliği — Faz 1 Envanter

**Tarih:** 2026-08-19  
**Kapsam:** keşif only. Bu fazda hiçbir kaynak dosya silinmedi, taşınmadı, değiştirilmedi.  
**Yöntem:** kanıt-önce (statik import grafı + rota kaynakları + API/hook taraması).  
**Dinamik yükleme:** `src/` altında `React.lazy(` ve `import(` eşleşmesi **yok** — lazy kaçışı yok.

---

## 0. Kırmızı çizgiler (bu raporda uygulandı)

- `src/layouts/subscription/**`, `src/layouts/supervisor/**`, `src/config/api.ts` ve bunların `routes.tsx` girişleri **hiçbir yerde “silinebilir” işaretlenmedi** — canlı ürün (FEAT-SaaS).
- Emin olunmayan hiçbir kalem B kolonuna yazılmadı.
- Asset’ler Faz-2’de bile temkinli: şüphe varsa kalır.

---

## 1. Rota kaynakları (kanıt)

Tek kaynak `src/routes.tsx` değil. Aşağıdaki dosyalar rota veya menü üretir:

| Kaynak | Rol | Tüketici |
|---|---|---|
| `src/routes.tsx` | Birincil rota tablosu + Sidenav menüsü | `App.tsx` `getRoutes()`, `examples/Sidenav` |
| `src/page.routes.tsx` | DefaultNavbar / pricing Header menüsü (Creative Tim şablonu) | `layouts/authentication/components/{Basic,Cover,Illustration}Layout`, `layouts/pages/pricing-page/components/Header` |
| `src/App.tsx` | Catch-all: `<Navigate to="/dashboards/analytics" />` (satır 161, 184) | React Router `*` |
| `src/index.tsx` | `AuthGate`: oturum yoksa `layouts/authentication/sign-in/basic` (Route değil, kök swap) | `createRoot` |
| `src/examples/Navbars/DashboardNavbar/index.tsx` | Doğrudan link: `/system/settings`, `/authentication/sign-in/basic` | Canlı dashboard chrome |
| `src/examples/Navbars/DefaultNavbar/index.tsx` | `to="/"` + `pageRoutes` dropdown + “buy now” (Creative Tim) | Auth layout’ları (canlı login dahil) |
| `src/examples/Sidenav/index.tsx` | Logo `NavLink to="/"` | Tüm dashboard sayfaları |
| `src/examples/Breadcrumbs/index.tsx` | `Link to="/"` | DashboardNavbar |
| `src/examples/Footer/index.tsx` | Varsayılan dış linkler: creative-tim.com (About/Blog/License) | Canlı sayfalar dahil (fleet map, subscription, supervisor) |
| `src/layouts/authentication/components/Footer/index.tsx` | Creative Tim dış linkleri | Canlı `BasicLayout` (login) |
| Auth sayfa içi `Link` | cover↔signup, illustration→signup | Yalnız demo auth varyantları |

**Bulunamayan ikincil nesneler:** `sidenavRoutes`, `footerRoutes`, `pageRoutes` adlı ayrı dosya yok (`page.routes.tsx` default export’u `pageRoutes`).

**`page.routes.tsx` kırık linkleri (navbar riski, canlı login DefaultNavbar’ında görünür):**

- `/pages/users/reports` — karşılık gelen layout **yok** (`layouts/pages/users/` yalnızca `new-user`).
- `/pages/account/setting` — typo; gerçek rota `/pages/account/settings` ve canlı rota `/system/settings`.

---

## 2. `src/layouts/` klasör ağacı

Yetim (hiçbir `routes.tsx` girişine bağlanmayan) **üst klasör yok**. Tüm 10 kök klasör ya canlı ürüne ya şablona bağlı.

```
applications/     calendar, data-tables, kanban, wizard
authentication/   components/{Basic,Cover,Illustration}Layout + Footer,
                  sign-in/{basic,cover,illustration}, sign-up/cover, reset-password/cover
dashboards/       analytics, sales     (dispatcher panosu YOK — canlı harita ayrı klasör)
dispatcher/       drivers, exceptions, tasks, tasks/optimize, vehicles
ecommerce/        orders/{order-details,order-list}, products/{edit,new,product-page}
live-fleet-map/   LiveFleetMap.tsx
optimization/     TourPlanningPlaceholder, TollAnalyticsPlaceholder
pages/            account/{billing,invoice,settings,components}, charts, notifications,
                  pricing-page, profile/{all-projects,profile-overview},
                  projects/timeline, rtl, users/new-user, widgets
subscription/     index + b2bApi          ← KORUNUR
supervisor/       index + customerDetail + SupervisorGate + supervisorSession  ← KORUNUR
```

**Klasör içi yetimler (rota yok, parent sayfa da import etmiyor):**  
`layouts/pages/account/settings/components/{Accounts,Header,Notifications,Sessions,TableCell}` — settings `index.tsx` bunları kullanmıyor; Sidenav yorumu “Header / accounts / sessions silindi” diyor. Dosyalar duruyor. → Tablo C.

---

## A) CANLI ÜRÜN (dokunulmaz)

| Route/Klasör | Kanıt (hangi akış, hangi API/hook) |
|---|---|
| `/dashboards/live-fleet-map` · `layouts/live-fleet-map/` | Sidenav Grup 1. `useMqttTelemetry`, `useFleetSnapshot`, `useActiveRoutes` → `ENTERPRISE_API_URL`. MQTT `dispatcher-readonly`. |
| `/dispatcher/tasks` · `layouts/dispatcher/tasks/` | Sidenav Grup 1. `useTasks`, `useDrivers`, `useVehicles` → `ENTERPRISE_API_URL` `/api/dispatcher/tasks\|drivers\|vehicles`. |
| `/dispatcher/tasks/optimize` · `layouts/dispatcher/tasks/optimize/` | Sidenav’da gizli; Tasks “Yeni Görev” butonu. `useTaskOptimization`, `useDispatchLocationSnapshot`, `useComplianceAssessment`, `useVehicles`, `useAuthStore`. **Canlı kanban burada:** `@asseinfo/react-kanban` doğrudan bu dosyada (ADR-0001). `layouts/applications/kanban` **değil**. |
| `/dispatcher/exceptions` · `layouts/dispatcher/exceptions/` | Sidenav Grup 1. `useExceptions` + `useAuthStore` → `ENTERPRISE_API_URL` `/api/dispatcher/exceptions`. |
| `/dispatcher/drivers` · `layouts/dispatcher/drivers/` | Sidenav Grup 3. `useDrivers`, `useVehicles`. |
| `/dispatcher/vehicles` · `layouts/dispatcher/vehicles/` | Sidenav Grup 3. `useDrivers`, `useVehicles`. |
| `/optimization/tour-planning` · `layouts/optimization/TourPlanningPlaceholder.tsx` | Sidenav Grup 2 gated placeholder (FEAT-001). Canlı API yok; ürün yol haritası ekranı — şablon e-ticaret/analytics değil. |
| `/optimization/toll-analytics` · `layouts/optimization/TollAnalyticsPlaceholder.tsx` | Sidenav Grup 2 gated placeholder (FEAT-008). Aynı gerekçe. |
| `/system/settings` · `layouts/pages/account/settings/` | Sidenav “Tenant & Sistem Ayarları” + DashboardNavbar dişli ikonu. `useUserProfile` / `useUpdateUserProfile` / `useChangePassword` / `useDeleteAccount` → `AUTH_API_URL`. `useNotificationPreferences` → `ENTERPRISE_API_URL`. |
| `/subscription` · `layouts/subscription/` | **PROTECTED.** `ENTERPRISE_API_URL` `/api/subscription/quota` + `/requests`. `useAuthStore`. |
| `/subscription/b2b-api` · `layouts/subscription/b2bApi/` | **PROTECTED.** Aynı API ailesi. |
| `/admin/supervisor` · `layouts/supervisor/` | **PROTECTED.** `SUPERVISOR_API_URL` `/api/superadmin/companies` + subscription requests. `SupervisorGate`. |
| `/admin/supervisor/customer-detail` · `layouts/supervisor/customerDetail/` | **PROTECTED.** Quota PATCH + request approve/reject. |
| AuthGate + `/authentication/sign-in/basic` · `layouts/authentication/sign-in/basic/` | `src/index.tsx` oturum kapısı. `useAuthStore.login` → `AUTH_API_URL`. Navbar “Logout” da aynı rotaya gider. |
| `layouts/authentication/components/BasicLayout/` | Yalnız canlı basic login’in kabuğu (`PageLayout` + `DefaultNavbar` + auth `Footer`). Cover/Illustration ile paylaşılmaz. |
| `src/config/api.ts` | **PROTECTED.** `AUTH_API_URL` / `ENTERPRISE_API_URL` / `SUPERVISOR_API_URL` tek kaynak. |

**A satır sayısı: 16**

Not: Subscription ve Supervisor Sidenav’da “Geliştirici & Demo Araçları” çekmecesinin **içinde**. Çekmeceyi toptan silmek A kalemlerini de düşürür — Faz-2 çekmeceyi parçalamadan önce bu iki collapse’i taşımalıdır.

---

## B) ŞABLON/DEMO — silinebilir aday

Hepsi Creative Tim MD2 PRO şablonu; canlı hook / `config/api.ts` kullanımı **yok**; mock `data/` import’u veya statik demo içerik var. Ters-bağımlılık taramasında **hiçbir A (canlı) dosyası** bu klasörleri import etmiyor.

| Route/Klasör | Kanıt (mock data / demo içerik) | Tahmini bağımlılıklar |
|---|---|---|
| `/ecommerce/products/new-product` · `layouts/ecommerce/products/new-product/` | Creative Tim ürün sihirbazı; API/hook yok. | `DashboardLayout/Navbar/Footer`. Kardeş ecommerce sayfaları. |
| `/ecommerce/products/edit-product` · `layouts/ecommerce/products/edit-product/` | Şablon form + `assets/images/products/product-11.jpg`. | Aynı chrome. |
| `/ecommerce/products/product-page` · `layouts/ecommerce/products/product-page/` | `data/dataTableData.tsx` mock; `assets/images/products/product-details-*`, `ecommerce/chair-*`. | `DataTable` (örnek; canlı dispatcher da kullanır → **DataTable silinmez**). |
| `/ecommerce/orders/order-list` · `layouts/ecommerce/orders/order-list/` | `data/dataTableData.tsx` mock + `team-*.jpg`. | `DataTable`. |
| `/ecommerce/orders/order-details` · `layouts/ecommerce/orders/order-details/` | Statik sipariş detayı; `product-12.jpg`, mastercard.png. | `examples/Timeline/TimelineItem` (optimize da kullanır → **Timeline silinmez**). |
| `/dashboards/sales` · `layouts/dashboards/sales/` | `data/{defaultLineChart,horizontalBarChart,salesTable,dataTable}Data` mock; bayrak PNG + ecommerce JPEG. Hook yok. | Chart örnekleri (çoğu yalnız demo; `ComplexStatisticsCard` canlıda da var — bu sayfa onu kullanmıyor). |
| `/applications/kanban` · `layouts/applications/kanban/` | `layouts/applications/kanban/data` mock board; Creative Tim. Dispatcher **bu sayfayı import etmiyor**. Canlı kanban `tasks/optimize` içinde ayrı `Board` import’u. | `@asseinfo/react-kanban` **paketi kalır** (optimize). `html-react-parser` yalnızca bu sayfada — paket adayı (Faz-2, `package.json` insan onayı). |
| `/applications/wizard` · `layouts/applications/wizard/` | Şablon 3 adımlı form; `team-2.jpg`. Hook yok. | Chrome only. |
| `/applications/data-tables` · `layouts/applications/data-tables/` | `data/dataTableData.ts` mock. | `DataTable` (silinmez). |
| `/applications/calendar` · `layouts/applications/calendar/` | `data/calendarEventsData.ts` mock; `examples/Calendar`. | `examples/Calendar` ayrıca widgets/rtl’de — B sayfaları birlikte silinirse `examples/Calendar` yetim adayı (C’ye bak). |
| `/pages/profile/profile-overview` · `layouts/pages/profile/profile-overview/` | `data/profilesListData.ts` mock; home-decor + team fotoğrafları. Sidenav’da iki kez (Profil Çekmecesi + Pages). | `examples/Cards` / `ProfilesList`. |
| `/pages/profile/all-projects` · `layouts/pages/profile/all-projects/` | Mock proje kartları + small-logos SVG. | `ComplexProjectCard`. |
| `/pages/users/new-user` · `layouts/pages/users/new-user/` | Formik şablon; API yok. | Chrome + local schemas. |
| `/pages/account/billing` · `layouts/pages/account/billing/` | Statik fatura UI; mastercard/visa. | **`layouts/pages/account/components/BaseLayout` canlı settings’te** — billing silinir, `components/` kalır. |
| `/pages/account/invoice` · `layouts/pages/account/invoice/` | Creative Tim fatura; `logo-ct.png`. | Aynı `BaseLayout` uyarısı. |
| `/pages/projects/timeline` · `layouts/pages/projects/timeline/` | `data/timelineData.ts` mock. | `TimelineList/Item` (optimize kullanır → silinmez). |
| `/pages/pricing-page` · `layouts/pages/pricing-page/` | Şablon fiyat + `pageRoutes` Header + gray-logos. | `DefaultNavbar` (canlı login de kullanır → silinmez). |
| `/pages/rtl` · `layouts/pages/rtl/` | RTL demo; widgets ile neredeyse kardeş mock data. | Chart/card örnekleri. |
| `/pages/widgets` · `layouts/pages/widgets/` | `data/*` mock (calendar, calories, categories). | Aynı örnek kit. |
| `/pages/charts` · `layouts/pages/charts/` | `data/*ChartData` mock; chart örneklerinin ana vitrini. | `examples/Charts/**` büyük kısmı yalnız burada (+ sales). |
| `/pages/notifications` · `layouts/pages/notifications/` | MD snackbar demosu; `href="#"`. | Chrome only. |

**B satır sayısı: 21**

`layouts/ecommerce/` (32 dosya, ~76 KB) ve `layouts/applications/` (17 dosya, ~57 KB) B ile birlikte klasör olarak kalkabilir. `layouts/pages/` toptan **silinemez** — `account/settings` + `account/components` A’dadır.

---

## C) DİKKAT — insan kararı gerekli

| Route/Klasör | Neden belirsiz |
|---|---|
| `/dashboards/analytics` · `layouts/dashboards/analytics/` | İçerik şablon (mock `reportsBarChartData` / `reportsLineChartData`, ürün fotoğrafları, hook yok). **Ama** (1) `App.tsx` `*` yönlendirmesi buraya, (2) login success `navigate("/dashboards/analytics")`, (3) Sidenav/Breadcrumbs `to="/"` → catch-all ile yine analytics. Silmek için bu üç kancayı canlı bir landing’e (ör. live-fleet-map) çevirmek gerekir. |
| `/authentication/sign-in/cover` · `cover/` | Görev talimatı: login hariç auth varyantları C. `useAuthStore` yok; CoverLayout + `bg-sign-in-cover.jpeg`. Navbar kırık-link kaynağı. |
| `/authentication/sign-in/illustration` · `illustration/` | Aynı: şablon, `useAuthStore` yok, `illustration-reset.jpg`. |
| `/authentication/sign-up/cover` · `sign-up/cover/` | Şablon kayıt; cover/illustration’dan `Link`. Canlı AuthGate signup kullanmıyor. |
| `/authentication/reset-password/cover` · `reset-password/cover/` | Şablon reset; API yok. |
| `layouts/authentication/components/CoverLayout/` + `IllustrationLayout/` | Yalnız C’deki demo auth sayfaları import eder. BasicLayout (A) bunlara bağlı değil. Demo auth silinirse bu iki layout da düşer — yine de BasicLayout/Footer/page.routes ile karıştırılmamalı. |
| `src/page.routes.tsx` | Dosya **canlı login** `BasicLayout` → `DefaultNavbar` tarafından import edilir. İçeriğin tamamı şablon linkleri (ecommerce, demo dashboards, Creative Tim docs href). Silmek login navbar’ını kırar; boşaltmak/üretmek ayrı karar. |
| `/pages/account/settings` (demo kopya rota) | Aynı `Settings` bileşeni hem `/system/settings` (A, sidebar) hem bu demo drawer rotasında. Rotayı kaldırmak güvenli görünür; **bileşeni** silmek A’yı kırar. |
| `settings/components/{Accounts,Header,Notifications,Sessions,TableCell}` | Canlı settings `index.tsx` import etmiyor (Sidenav yorumu eski blokların kaldırıldığını söylüyor). Yetim şablon artığı ama canlı klasörün içinde. |
| `settings/components/Authentication` (2FA kartı) | Canlı settings sayfasında **render ediliyor**; içerik Creative Tim statik “2FA enabled” — gerçek API yok. Kartı silmek ürün ayarları UX kararı. |
| `layouts/pages/account/components/` (`BaseLayout`, `FormField`) | Settings (A) + billing/invoice (B) ortak. B silinse bile bu klasör kalır. |
| `src/examples/**` demo-only alt ağaçlar | `Charts/**`, `Cards/BookingCard`, `Cards/MasterCard`, `Cards/PricingCards`, `Lists/ProfilesList`, `Calendar`, `Tables/SalesTable` vb. çoğunlukla yalnız B (+ analytics C). **Ama** `DashboardLayout`, `DashboardNavbar`, `DataTable`, `ComplexStatisticsCard`, `Timeline*`, `DefaultItem`, `Sidenav`, `Configurator`, `DefaultNavbar`, `PageLayout` canlı. examples toptan silinemez. |
| `public/screenshots/mobile/**` | `src/` içinde referans yok. Marketing / C-04 ticker malzemesi (git’te untracked). Şablon sayfa değil; ürün dokümantasyonu olabilir. |
| `src/assets/images/` yetim dosyalar | Hiçbir `.ts/.tsx` import’u yok (~4.5 MB: ecommerce artıkları, `bg-smart-home-*`, `ivancik.jpg`, `shapes/*`, kullanılmayan small-logos). Kanıtlı yetim gibi duruyor; **şüphe kuralı:** 50 KB için build kırılmaz — Faz-2 temkinli, isim-isim. |
| Auth chrome (DefaultNavbar “buy now”, auth Footer Creative Tim, `examples/Footer` default Creative Tim) | Canlı login ve canlı dashboard sayfalarında görünür. Sayfa silme değil, metin/link temizliği. |

**C satır sayısı: 15**

---

## 3. `routes.tsx` — B listesine ait satır özeti

Kaynak: `src/routes.tsx`. B bileşenleri üstte import, menüde `developer-preview-drawer` collapse içinde.

**Import satırları (B):** 28–31 (Calendar, DataTables, Kanban, Wizard), 34–36 (Cover/Illustration/SignUp — aslında C), 32 ResetCover (C), 37 Analytics (C), 38 Sales (B), 39–42 + 49 ecommerce (B), 50–60 pages demo (B; **Settings import’u satır 25 A’dır**, satır 50 Billing B’dir).

**Menü (sidebar’da görünen B kalemleri)** — parent: `name: "Geliştirici & Demo Araçları (Demo)"`, `key: "developer-preview-drawer"` (satır 170–403). Sidenav bu collapse’i **gösterir**.

| Sidebar grubu | Görünen B adları | Route |
|---|---|---|
| Profil Çekmecesi (Demo) | My Profile, All Projects | `/pages/profile/*` (Settings buradaki kopya A bileşeni; Logout → basic login A) |
| Dashboards (Demo) | Sales | `/dashboards/sales` (Analytics bu grupta ama **C**) |
| Pages (Demo) | Profile Overview, New User, Billing, Invoice, Timeline, Pricing Page, RTL, Widgets, Charts, Notifications | `/pages/...` |
| Applications (Demo) | Kanban, Wizard, Data Tables, Calendar | `/applications/...` |
| Ecommerce (Demo) | New/Edit Product, Product Page, Order List, Order Details | `/ecommerce/...` |

**Bu çekmecede duran A kalemleri (silinemez):** Abonelik (`/subscription`, `/subscription/b2b-api`), Supervizör (`/admin/supervisor`, `.../customer-detail`). Authentication (Demo) grubunun dört varyantı + Reset → **C**; Sign In Basic → **A**.

---

## 4. Tahmini bundle kazancı (kabaca, dosya boyutlarından)

CRA, **import edilen** modül + asset’i paketler. Silinen sayfa import grafından düşünce webpack onları almaz.

| Dilim | Kaynak boyutu | Not |
|---|---|---|
| B layout TS/TSX | ~352 KB | ecommerce 76 + applications 57 + sales 22 + pages−settings (~197) |
| C analytics TS/TSX | ~15 KB | Landing kancası çözülürse ek |
| Demo auth TS/TSX (C) | ~13 KB | Cover/Illustration/SignUp/Reset + iki layout |
| `src/examples` (paylaşımlı) | 270 KB toplam | Toptan silinmez; chart/card alt kümesi B+analytics gidince düşer |
| `src/assets/images` toplam | **17.18 MB / 108 dosya** | Canlı import: `tulipfleet-logo.png` + `bg-sign-in-basic.jpeg` |
| B+C sayfalarının import ettiği Creative Tim görselleri | tahminen **~10–12 MB** | team/home-decor/products/ecommerce/bg-* / bayraklar / gray-logos |
| Hiç referans almayan yetim görseller | **~4.5 MB / 43 dosya** | Webpack grafında zaten yok — disk/repo kazancı, bundle değil |
| `public/screenshots/mobile` | ~1.2 MB | Uygulama bundle’ına girmez |

**Gerçekçi Faz-2 kazancı (yalnız B, analytics durursa):** yüzlerce KB JS + import grafından çıkan JPEG/PNG (muhtemelen birkaç MB gzip öncesi). Landing analytics + demo auth da giderse görsel kazanç artar. Yetim asset silmek bundle’ı küçültmez.

**npm:** `@asseinfo/react-kanban` kalır (optimize). `html-react-parser` yalnız demo kanban’da — paket kaldırma adayı, `package.json` insan onayı.

---

## 5. Asset / medya envanteri

### `src/assets/images/` (108 dosya, 17.18 MB)

| Klasör | Boyut | B-aday sayfa kullanımı | Canlı kullanım |
|---|---|---|---|
| `(kök JPEG/PNG)` | 9.3 MB / 36 | team-*, home-decor-*, bruce-mars, bg-sign-in-cover/up/reset, bg-pricing/profile/player, logo-ct* | **`tulipfleet-logo.png`, `bg-sign-in-basic.jpeg`** |
| `products/` | 2.9 MB / 13 | analytics (C) product-1/2/3-min; ecommerce product-details + product-11 | yok |
| `illustrations/` | 2.5 MB / 4 | illustration-reset.jpg (C auth); pattern-tree.svg via MasterCard (B/C) | yok |
| `ecommerce/` | 2.3 MB / 26 | sales + product-page (birkaç JPEG); **18 dosya hiç import edilmiyor** | yok |
| `shapes/` | 376 KB / 2 | **hiç import yok** | yok |
| `small-logos/` | 135 KB / 14 | profile/all-projects + yetim settings Accounts | yok |
| `logos/` | 128 KB / 8 | pricing TrustedBrands, billing, invoice, MasterCard | yok |
| `icons/flags/` | 6 KB / 5 | analytics + sales | yok |

**B sayfalarının işaretli asset’leri:** ecommerce JPEG/ürün fotoğrafları, team-*, kanban office-dark/meeting/home-decor-1, pricing bg + gray-logos, profile home-decor/bruce-mars, widgets/rtl bg-player.

**Kanıtlı yetim (hiçbir TS/TSX import’u yok) — Faz-2 temkinli aday, şüphede kalır:**  
`apple-icon.png`, `favicon.png`, `bg-smart-home-1.jpg`, `bg-smart-home-2.jpg`, `drake.jpg`, `ivancik.jpg`, `down-arrow*.svg`, `shapes/*`, `illustrations/illustration-lock.jpg`, `illustration-verification.jpg`, `products/product-{4,5,6,7}-min.jpg`, `ecommerce/` altında adidas-hoodie, alchimia-chair, burberry, d&g-skirt, fendi-coat, gold-glasses, green-sofa, heron-tshirt, living-chair, macbook-pro, mcqueen-shirt, metro-chair, off-white-jacket, orange-sofa, undercover, wooden-table, yellow-chair, yohji-yamamoto; `small-logos/{bootstrap,creative-tim,devto,github,google-webdev,icon-bulb,icon-sun-cloud,logo-jira}.svg`.

### `public/`

| Yol | Not |
|---|---|
| `index.html`, `manifest.json`, `robots.txt`, `favicon.png`, `apple-icon.png` | CRA kabuğu — dokunulmaz |
| `public/screenshots/mobile/**` | ~15 JPG + MD + one-pager PDF. `src/` referansı yok. C. |

---

## 6. Kanban soruşturması (beklenen B adayı)

Şüphe: “kanban canlı dispatcher’da kullanılıyor olabilir.”

| Aday | Sonuç |
|---|---|
| `layouts/applications/kanban` | Yalnız `routes.tsx` + kendi alt bileşenleri. Mock `data/`. Hook yok. **B.** |
| `layouts/dispatcher/tasks/optimize/index.tsx` | `@asseinfo/react-kanban` `Board` import’u + CSS. Canlı VRP onay tahtası. **A. Paket kalır.** |

---

## 7. Ters-bağımlılık özeti (B → A kaçışı yok; A → shared examples var)

- B layout’larından canlı layout’a import **yok**.
- Canlı sayfalar B layout’larını import **etmiyor**.
- Paylaşılan `examples/*` ve `pages/account/components` B silinince **kalmalı**.
- `page.routes.tsx` canlı login navbar’ına bağlı (C).
- Dinamik import taraması boş; “kullanılmıyor sanılan lazy” riski yok.

---

## 8. Faz-2 için bağlayıcı uyarılar (silme yok, hatırlatma)

1. `developer-preview-drawer` toptan silinemez — içinde subscription + supervisor (A) var.
2. `/dashboards/analytics` silinmeden önce `App.tsx` catch-all, login `navigate`, Sidenav `to="/"` değiştirilmeli.
3. `Settings` bileşeni iki rotada; demo rotayı kaldırmak ≠ settings klasörünü kaldırmak.
4. `BasicLayout` + `sign-in/basic` + `bg-sign-in-basic.jpeg` + `tulipfleet-logo.png` dokunulmaz.
5. Asset silme: yalnız yukarıdaki yetim listesi, tek tek, şüphe kalır.

---

## BASELINE: tsc-0 (2026-08-19)

```
npx tsc --noEmit
exit code: 0
```

Faz-1 anında tip hatası yok. Faz-2 sonrası aynı komutla kıyaslanacak.
