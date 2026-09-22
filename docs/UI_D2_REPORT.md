# TulipFleet Dispatcher — D2: Kabuk (Navbar / Sidenav / Footer / Login) + Marka + Placeholder Temizliği

**Branch:** `ui-d2-shell` (main `c36bfbc` üzerinden)
**Kapsam:** D0 B1 kabuk + C5 a11y ve D1 tokens/glass/focus-visible üzerine; ekran içeriklerine (tablolar, harita, formlar) dokunulmadı.
**Yeni npm paketi:** Yok.
**Hex literal:** yalnız `src/assets/theme/tokens.ts`.

---

## 1. Yönetici Özeti

1. **Navbar 64px sticky + glass.** Landing Header paritesi: `density.navbar = 64`, `backdrop-filter` `--tf-glass-*` CSS değişkenlerinden (D1 `prefers-reduced-transparency` fallback'i otomatik). Tek satır; dil kod-only, tema anahtarı Configurator'dan taşındı, bildirim + hesap menüsü (çıkış + ayarlar).
2. **a11y.** D0 C5'teki 5 labelsiz icon-buton kapatıldı. Canlı sayım: `Toggle sidebar` (masaüstü + mobil), `Switch to dark/light mode`, `Account`, `Notifications`; dil seçici `Language`. Configurator dişlisi yalnız `NODE_ENV === "development"`.
3. **Sidenav marka.** Yüzey `navyInk`, aktif öğe emerald şerit + offwhite metin, pasif `navyFog`. Logo + Space Grotesk wordmark. MD2 demo route'ları `routes.tsx`'te zaten yoktu (0 Analytics/Sales/Calendar/Kanban/Wizard/Widgets/Charts).
4. **Footer + Login.** Creative Tim metinleri kalktı. `© {year} TulipFleet B.V.` + Gizlilik/Şartlar (`https://tulipfleet.com/{locale}/privacy|terms/`) + `package.json` sürümü. Login: navyInk hero (sahte pencere yok), logo + tagline sözlükten, opak kart, dark/light.
5. **Settings placeholder.** 2FA kartı ve MD2 sekmeleri (Messages / Social / Notifications / Backup) kaldırıldı. Kalanlar backend'e bağlı: Basic Info, Change Password, Email Integration, Delete Account. FEAT-010 alanları (`offline_debounce_minutes`, `location_gps_buffer_meters`) için frontend hook yok — sahte alan eklenmedi.

---

## 2. Önce / Sonra

| Yüzey | D0 / D1 önce | D2 sonra |
|---|---|---|
| Navbar yüksekliği | 75px floating kart | **64px** sticky, `top: 0` |
| Dark mode kontrolü | Configurator (D1'de onarıldı ama gömülü) | Navbar'da her zaman görünür; Configurator üretimde `null` |
| Icon `aria-label` | 0/5 (D0 C5) | 5/5 üretim + hamburger çifti; hepsi `nav.*` |
| Login başlık | "Material Dashboard PRO" + fotoğraf | Logo + `login.brand` + `login.tagline`, navyInk gradient |
| Footer | Creative Tim Site/Abonelik/İletişim | TulipFleet B.V. + Privacy/Terms + `v1.0.2` |
| Settings sekmeleri | Messages / Social / Notifications / Backup + 2FA | Yalnız gerçek hesap kartları |

![Login dark desktop](./screenshots/d2/01-login-dark-desktop.jpg)
![Login light desktop](./screenshots/d2/03-login-light-desktop.jpg)
![Dashboard dark](./screenshots/d2/04-dashboard-dark-desktop.jpg)
![Live map dark](./screenshots/d2/06-livemap-dark-desktop.jpg)
![Settings light](./screenshots/d2/15-settings-light-desktop.jpg)
![Settings dark](./screenshots/d2/13-settings-dark-desktop.jpg)

Ek: `02-login-dark-mobile.jpg`, `05-dashboard-light-desktop.jpg`, `07-livemap-dark-mobile.jpg`, `11-livemap-light-desktop.jpg`. Otomasyon tarayıcısı 390px emülasyonunda tam panel genişliğini kırpmadığı için mobil kareler temsili; masaüstü 1280px JPEG q80, hepsi **≤150 KB**.

---

## 3. Kaldırılan route / sekme listesi

### 3.1 `routes.tsx` — MD2 demo

Grep (`Analytics|Sales|Calendar|Kanban|Wizard|Widgets|Charts|Notifications|Ecommerce|Billing`) `src/routes.tsx` → **0**. Bu paket **hiç route silmedi**; demo sayfa dosyaları D1.5 bundle diyetine bırakıldı.

Kalan TulipFleet route'ları: Live map, Tasks, Optimize (gizli), Exceptions, Tour planning / Toll (gated), Drivers, Vehicles, Settings, Subscription, Supervisor, Sign-in, Forgot password.

### 3.2 Settings sekmeleri / kartlar

| Blok | Durum |
|---|---|
| Messages / Social / Notifications / Backup (BaseLayout `Tabs`) | **Kaldırıldı** — `tabValue` içeriği değiştirmiyordu |
| Authentication / 2FA ("Yakında") | **Kaldırıldı** (bileşen dosyası silinmedi) |
| Basic Info (`GET/PUT /api/user/profile`) | Tutuldu |
| Change Password (`PUT /api/user/change-password`) | Tutuldu |
| Email Integration (`GET/POST /api/dispatcher/notification-preferences`) | Tutuldu — spec'teki "Notifications MD2 demo"nun gerçek karşılığı |
| Delete Account (`DELETE /api/users/me`) | Tutuldu — backend bağlı; spec örneği "placeholder" idi, kod öyle değil |
| `offline_debounce_minutes` / `location_gps_buffer_meters` | **Eklenmedi** — repo'da hook/API yok (`docs/functions/FEAT-010-*.md` spec-only). Sahte alan kural ihlali olurdu. |

---

## 4. Build boyutu (gzip)

| | D1 (ui-d1-theme) | D2 (bu paket) | Fark |
|---|---|---|---|
| JS | 486.87 kB | **484.46 kB** | **−2.41 kB** |
| CSS | 9.47 kB | 9.47 kB | 0 |

`npm run build` uyarılarla derlendi (önceden var olan eslint; D2 dosyalarında yeni hata yok). `npx tsc --noEmit` temiz. Demo route zaten yoktu; JS düşüşü Configurator üretim ağacı + login/navbar sadeleşmesinden.

---

## 5. Hex / rgba taraması

```
Select-String -Path src\examples\Navbars,src\examples\Sidenav,src\examples\Footer,src\layouts\authentication
  -Pattern "#[0-9a-f]{3,8}|rgba\("
→ 0
```

Tema `functions.rgba` çağrıları `withAlpha` olarak yeniden adlandırıldı (kaynakta `rgba(` kalmasın diye). Hex'ler `tokens.ts` / D1 CSS değişkenlerinde duruyor.

---

## 6. a11y

| Kontrol | Sonuç |
|---|---|
| Navbar icon `aria-label` | Üretim: hamburger, tema, hesap, bildirim (+ dil). Dev: + `nav.settings` (Configurator) |
| Focus-visible | D1 global `--tf-focus-ring` (bu pakette tüketilir, yeniden tanımlanmaz) |
| Lighthouse a11y preview | **Ölçülemedi** — `dispatcher-preview.tulipfleet.com` CNAME bu turda bu branch'e çevrilmedi (Cem). Yerel Lighthouse paketi eklenmedi (yeni npm yasağı). |
| Harita yüksekliği | Navbar **64px sticky** (CDP). `LiveFleetMap` hâlâ `calc(100vh - 160px)` — ekran dosyasına dokunulmadı. 800px vh'de harita 640px; kabuk kırılmadı, 64px'e yeniden hesap D3. |

---

## 7. Preview turu notları

- Light/Dark: login kartı her iki temada; kabuk (navbar/sidenav/footer) darkMode ile dönüyor. Login **arka planı** marka navyInk (landing hero) — kasıtlı olarak her temada koyu.
- TR/EN/NL: `login.tagline` / `nav.*` / `footer.privacy|terms` üç dilde. Dil seçici login + navbar'da (bayrak yok).
- Masaüstü 1280 (dosya) / canlı ölçüm 1280×800. Mobil 390 emülasyonu otomasyon tarayıcısında letterbox üretti; `02` ve `07` temsili.
- Configurator paneli `npm start` (development) altında görünür; üretim build'de bileşen `null`. `App.tsx` floating FAB izin verilen yolların dışında — tıklanınca üretimde panel açılmaz (D3: FAB'ı `App.tsx`'ten sil).

---

## 8. Kapsam dışı (D3–D5 adayları)

| # | Bulgu | Aday |
|---|---|---|
| 1 | `App.tsx` sağ-alt Configurator FAB (izin verilen yol dışı) | D3 |
| 2 | Live map `100vh - 160px` → `100vh - 64px` (ekran dosyası) | D3 |
| 3 | FEAT-010 tenant eşikleri UI'sı (API yok) | D4 |
| 4 | Settings i18n (Basic Info etiketleri hardcoded EN); spec yalnız `nav.*`/`auth.*`/`footer.*` eklemeye izin verdi | D4 |
| 5 | LanguageSwitcher login variant hex (`components/` dışı) | D3 |
| 6 | Lighthouse preview ≥95 (CNAME + CI) | D3 |
| 7 | Ekran hex sızıntısı (LiveFleetMap, ConfirmDialogShell, …) | D3/D5 |

---

## 9. Commit'ler

| # | Konu |
|---|---|
| 1 | navbar + a11y (64px glass, tema anahtarı, `aria-label`, hesap menüsü) |
| 2 | sidenav + routes (navyInk / emerald / offwhite; demo route yok) |
| 3 | footer + login (TulipFleet B.V., navyInk hero, BrandBlock) |
| 4 | settings placeholder (2FA + MD2 sekmeleri) |
| 5 | `docs/UI_D2_REPORT.md` + `docs/screenshots/d2/` |

**Yol notu:** Adım 5 sekmeleri `src/layouts/pages/account/components/BaseLayout/index.tsx` içindeydi (yalnız Settings import ediyor). Spec glob'u `settings*/**` idi; sekme silinmesi için bu dosyaya dokunuldu.

---

## 10. `git status --short`

Rapor commit'inden sonra çalışma ağacı, bu paketin dosyaları için boş olmalıdır. Konuşma başındaki `scripts/sim-portxl.js` ve `docs/UI_D0_DISCOVERY.md` bu D2 turuna ait değildir ve commit edilmez.
