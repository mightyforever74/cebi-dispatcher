# FEAT-SAAS: Self-Service Subscription & Supervisor Management Spec

Surum: v1.0 (2026-08-05) · Karar sahibi: Cem · Uygulayici: Claude
Durum kaynagi: bu dosya. Her faz kapanisi buraya islenmeden sonraki faza GECILMEZ.

## 1. Amac ve Kesin Kurallar (Guiding Principles)
- **Klon Zorunlulugu:** Sifirdan CSS/Layout yazmak KESINLIKLE YASAKTIR. Projedeki
  mevcut 4 Ecommerce demo sayfasi birebir klonlanarak sadece icerik, isim ve
  islevleri TulipFleet SaaS mantigina uyarlanacaktir.
- **DB-Tabanli Durum Akisi:** B2B API ve Arac Kota talepleri asla e-posta
  uzerinden yurutulmeyecektir. Tum surec Veritabani Tabanli Durum Yonetimi
  (PENDING_APPROVAL -> APPROVED/REJECTED) ile ekranlar uzerinden yonetilecektir.
  E-posta sadece asenkron bildirim (notification) aracidir.
- **Durustluk Ilkesi:** Sahte sayac, simule edilmis canli API key veya sahte UI
  guvenlik tiyatrolari kesinlikle yasaktir.

## 2. Dort Sayfa Haritasi ve UI/UX Link Eslesmesi

### Sayfa 1: 💳 Abonelik & Arac Yonetimi (`/subscription`)
- **Kaynak:** `src/layouts/ecommerce/products/new-product` (localhost:3000/ecommerce/products/new-product)
- **Islev:** Mevcut plan ve tanimli arac kotasi (or. 12 / 15 Arac) gosterilir
  (payda=companies.max_vehicles, pay=retired-haric COUNT(vehicles)). Otomatik
  kart cekimi veya otomatik tenant artirimi YOKTUR. Kullanici form uzerinden
  "Lisans / Arac Sayisi Artirim Talebi" olusturur (status: PENDING_APPROVAL).
  Ekranda "⏳ Talebiniz Incelemede" statusu belirir.

### Sayfa 2: ⚡ TulipFleet Connect (B2B API) (`/subscription/b2b-api`)
- **GUNCELLEME (2026-10-12): FEAT-Connect CANLIYA ALINDI, bu bolumun asagidaki
  orijinal "Yakinda" plani ARTIK GECERSIZ — bkz. ROADMAP.md Change Log
  2026-10-12 satiri ve `docs/functions/FEAT-010-automated-exception-handling.md`
  disinda, FEAT-Connect'in kendi implementasyon kaydi icin asagidaki not
  yeterlidir (ayrica bir FEAT-Connect spec dosyasi acilmadi).** Sayfa artik
  gercek self-servis panel: musteri API key'i kendi basina anik olusturur
  (plaintext tek seferlik gosterim) ve iptal eder, kalan arac kotasini
  (`GET /api/subscription/quota`, Sayfa 1'le ayni sozlesme) canli gorur.
  Onay/approval YOK — SAHTE SAYAC/SIMULE KEY yasagi (Ilke #3) korunarak, artik
  gercek anahtar ve gercek sayaç gosteriliyor. Mimari: dual-auth middleware
  (JWT veya API key, `lib/auth/authenticateRequest.js`) + ozel per-customer
  rate limiter (auth SONRASI preHandler, `lib/rateLimit/*`) + global IP
  backstop (`@fastify/rate-limit`) + tarife TTL cache (`lib/cache/ttlCache.js`)
  ile anti-scraping/server-cost korumasi. Penetrasyon fiyatlandirmasi
  (€0.20-0.50/arac/ay, butce onayi gerektirmeyen frictionless model) mimari
  baglam olarak kullanildi; ayri bir metered-billing implementasyonu bu
  kapsamda YAPILMADI (ROADMAP R3/SIRA-4'un 5 kaleminden sadece (1) API Key
  auth middleware ve (2) kota sayaci teslim edildi — (3) metered billing,
  (4) public `/v1/*` facade, (5) OpenAPI spec hala tetiksiz).
- **ORIJINAL PLAN (v1.0, artik gecersiz — tarihsel kayit icin korunuyor):**
  ~~Kaynak: `src/layouts/ecommerce/products/edit-product`. UI layout'u
  klonlanarak kurulur. Sayfa durustce "TulipFleet Connect (FEAT-Connect) —
  B2B API Servisi Yakinda Hizmetinizde" durumuyla kurgulanir. API Key
  altyapisi mustakil FEAT-Connect kalemi olarak ROADMAP'e yazilir.~~

### Sayfa 3: 🛡️ Supervizor Komuta Merkezi (`/admin/supervisor`)
- **Kaynak:** `src/layouts/ecommerce/orders/order-list`
- **Islev:** Tablo yapisi (filtre/arama/pagination) birebir korunur. Tum
  musteri/firma listesi basilir (firma, ulke/tax_id, arac sayisi/kota, bekleyen
  talep durumu, aksiyon). Guvenlik duvari D-S2 ile korunur. "Incele" -> Sayfa 4.

### Sayfa 4: 🔍 Musteri Detay & Yonetim Paneli (`/admin/supervisor/customer-detail`)
- **Kaynak:** `src/layouts/ecommerce/orders/order-details`
- **Islev:** Sol blokta bekleyen "Arac Artirim" talepleri; "ONAYLA VE KOTAYI
  TANIMLA" -> APPROVED + kota guncellenir + musteriye onay maili (best-effort).
  Sag blokta Supervizor manuel kota degisimi yapip muhurler (audit log zorunlu).

## 3. Muhurlu Mimari Kararlar

### 🛡️ D-S1: Talep ve Kota Veritabani Mimarisi
- **Talep yazimi:** dispatcher -> enterprise backend ->
  `enterprise.subscription_requests` (PENDING_APPROVAL). Enterprise'in yetki
  modeli korunur (public.* SELECT-only, yazma yalniz enterprise.*).
- **Onay & muhurleme:** Supervizor onayi Ana Fleet Backend SuperAdmin
  endpoint'ine gider; `public.companies.max_vehicles` guncellenir +
  `public.subscription_audit_logs`'a MEVCUT sozlesmeyle muhur dusulur
  (action/old-new/changed_by/metadata.request_id).
- *Hizalama notu:* onay endpoint isim-uzayi, kanitli mevcut desene uyar:
  `/api/superadmin/subscriptions/*` (superadmin.companies/devices ile ayni aile).

### 🛡️ D-S2: Durust Supervizor Guvenlik Kapisi
- Sahte UI sifre modali yasaktir. Rotalar strictly `role === 'super_admin'`
  JWT denetimiyle korunur (rol adi ALT CIZGILI — koddan kanitli).
- Sayfa girisinde `/api/auth/login` uzerinden gercek E-posta + Parola
  Re-Authentication yapilir. Re-Auth basarili olmadan musteri verisi HIC
  cekilmez (401/403).

### 🟡 Kapsam Muhru (FEAT-Connect) — GUNCEL DURUM: KAPANDI (2026-10-12)
- Sayfa 1, 3, 4: uctan uca canli, gercek DB/API. **Sayfa 2 de artik uctan uca
  canli** — self-servis API key uretimi/iptali + gercek kota gorunumu.
  Eski `request_type='api_package'` manuel on-talep akisi artik KULLANILMIYOR
  (yeni talep uretilmiyor); Supervizor Musteri Detay panelindeki olasi
  yetim/eski talep satirlari artik "self-servis aktif, onay gerekmiyor"
  rozetiyle gosteriliyor (eski "FEAT-Connect — Yakinda" metni kaldirildi,
  en/nl/tr).

## 4. Faz Plani ve DURUM

| Faz | Icerik | Durum |
|---|---|---|
| S1 | Sema: enterprise.subscription_requests (migration 1783100000000) | ✅ 617fccc — staging'de tablo+pgmigrations kaydi; PROD AYNASI bakim penceresine |
| S2-E1 | Enterprise endpointleri: POST/GET /api/subscription/requests + GET /api/subscription/quota | ✅ 0e21557 + smoke 3/3 (05.08: Dobbe 4/10 professional; talep 2af1d893 PENDING) |
| S2-E2 | Ana backend: routes/superadmin.subscriptions.js (bekleyen liste / approve+audit+mail / reject) — STAGING-ONCE | ⬜ |
| S3 | Sayfa 1 + 2 klon/uyarlama (musteri tarafi) | Sayfa 1 ✅ c9381a9 (kota 4/10 canli, PENDING kalici, tier dinamik; UI karesi sonraki oturumda) · Sayfa 2 ✅✅ (2026-10-12: "Yakinda" plani SUPERSEDE edildi — FEAT-Connect self-servis dashboard CANLI, bkz. §7 asagida ve ROADMAP.md 2026-10-12 kaydi) |
| S4 | Sayfa 3 + 4 klon/uyarlama (Supervizor) + D-S2 kapisi | ✅ 05.08 — gate gercek re-auth (negatif 401/403 canli), manuel kota endpoint'i 6cb4cfb (audit quota_manual_update), api_package durust rozet; UI kareleri sonraki oturumda |
| S5a | Uctan uca smoke: talep -> gate 403 negatif + re-auth -> approve (10→13 UI + 10→11 curl) -> manuel muhur -> MAIL TESLIM (info@ kutusunda kanitli, 09.08) | ✅ ekran+psql+kutu kanitli. Notlar: (1) Gmail From'u SMTP hesabiyla eziyor — info@ alias dogrulamasi ROADMAP'e; (2) 2x no-op 13→13 muhru: UI alan tazeleme puruzu, no-op'a 400 iyilestirmesi S5b'ye; (3) billing_email=info@ duzeltildi; (4) JWT ders tazelendi: talep=PROD token→enterprise, onay=STAGING token→staging |
| S5b | Prod aynasi | ✅ 10.08 penceresi (~10dk): yedek + migration prod'a ILK yaratim (defter 46) + backend 6cb4cfb (dual-bind/EMQX korundu) + smoke health 200 / superadmin liste [] / 403 negatif. FEAT-SAAS TAMAMLANDI — kalan iyilestirmeler: no-op kota 400 (staging'de), Sayfa-4 ayni-deger disable, Gmail info@ alias (Cem), FEAT-Connect ikinci dalga |

## 5. Kanit Envanteri (mevcut altyapi — mukerrer insa YASAK)
- `public.companies`: max_vehicles / max_drivers / max_admins / per_vehicle_fee /
  subscription_tier/status/starts/ends MEVCUT (SuperAdmin v3 mirasi).
- `public.subscription_audit_logs` MEVCUT: id/company_id/action/old_new_status/
  old_new_tier/old_new_fee/reason/metadata jsonb/changed_by/created_at (FK users+companies).
- Rol dizesi: `super_admin`. PG deseni: `fastify.pg.connect()` + client (ana) /
  `fastify.pg.query` (enterprise). Mail: `fastify.transporter` guard'li best-effort.
- Arac sayimi sozlesmesi: `status != 'retired'`.
- Register desenleri: enterprise `server.js` ~satir 39-51; ana backend ~535/544
  (`routes/superadmin.*.js` ailesi).
- Kaynak sayfalar + bilesen agaclari: `src/layouts/ecommerce/...` (30 dosya envanteri 05.08).

## 6. FEAT-SAAS-2: Public Onboarding (muhur 10.08.2026)

**D-L1:** Landing = AYRI hafif site (tulipfleet.com); dispatcher operasyon paneli ayri kalir (decoupling/SEO).
**D-O1:** Trial kaydi subscription_requests'e YAZILMAZ (o tablo onay defteri); gorunurluk Komuta Merkezi'nde subscription_status='trial' filtresi/TRIAL rozeti.
**D-O2:** Anti-bot v1: honeypot alan (doluysa sessiz 200) + endpoint-ici in-memory IP rate-limit 3/saat (restart'ta sifirlanir — kabul edilen v1 siniri).

### POST /api/auth/public-signup (auth'suz)
Payload: { company_name, admin_email, admin_name, phone, estimated_vehicles?, hp_field }
Muhur (KANITLI check'lerle): companies -> status='active', subscription_status='trial',
subscription_tier='starter', max_vehicles=5, is_trial=true, trial_ends_at=NOW()+interval '14 days'.
users -> role='company_admin', guvenli gecici parola (v1; sifre-belirleme token linki = FEAT-SAAS-2.1).
Mail: mevcut fastify.transporter best-effort (COMMIT sonrasi) — hosgeldin + gecici parola.
Tek transaction: company + user; unique email cakismasi -> 409.

**Faz durumu:** S-O1 ✅ fca4089 (10.08 staging; smoke 4/4: 201+trial muhru DB-kanitli, 409 mukerrer, honeypot yutma Bot=0; D-O3-SADE uygulandi: parola/OTP gonderilmez, kullanilamaz-hash + forgot-password yonlendirmesi — mevcut OTP zinciri yeniden kullanilir) · S-O2 landing (Cursor) ⬜ · 2.1 token-link: D-O3-sade ile BUYUK OLCUDE GEREKSIZLESTI (landing'e 'sifre belirle' UX'i S-O2'de) · prod inisi: sonraki bakim penceresi (63d45c4+fca4089 birlikte)

## 7. Cursor Cagi Ilk Teslimler (11.08.2026)
- API-Config refactor ✅ b9d0523: src/config/api.ts uc-backend ayrimiyla; tsc-0, literal-grep temiz, smoke 4/4.
- tulipfleet-landing repo DOGDU ✅ (GitHub 978950b'ye kadar): Astro 16 sayfa; /en+/tr canli, 7 dil placeholder; signup staging public-signup'a CANLI bagli (%100 test); Giris = PUBLIC_APP_URL || /early-access (D-L4=a).
- Polish v1 ✅ (7 commit): kontrast/semantik/i18n duzeltmeleri + hero ticker (gercek Leiden rakamlari) + stats band (21/148.8/6 kanitli) + NL kontur haritasi (canli 6 sehir) + dil secici (en/tr aktif, 7 yakinda, src/config/i18n.ts) + reduced-motion/klavye erisimi.
- .cursorrules/.cursorignore kuruldu (repo disi); PROTECTED FEATURES + THREE BACKENDS kurallari gomulu.
- TODO (landing): logo, screenshots/, early-access backend POST, 7 dil icerigi (Sira-4).

## 7. Cursor Cagi Ilk Teslimler (11.08.2026)
- API-Config refactor ✅ b9d0523: src/config/api.ts uc-backend ayrimiyla; tsc-0, literal-grep temiz, smoke 4/4.
- tulipfleet-landing repo DOGDU ✅ (GitHub, 978950b+): Astro 16 sayfa; /en+/tr canli; Giris = PUBLIC_APP_URL || /early-access (D-L4=a).
- Polish v1 ✅ (7 commit): kontrast/semantik/i18n duzeltmeleri + hero ticker (gercek Leiden rakamlari) + stats band (21/148.8/6) + NL kontur haritasi (canli 6 sehir) + dil secici (en/tr aktif, 7 yakinda; src/config/i18n.ts) + reduced-motion.
- UCTAN UCA ZINCIR KANITLI ✅: landing /signup formu -> public-signup -> Komuta Merkezi'nde 'cursor test firmasi · 0/5 · starter · trial' satiri. Ilk gercek musteri yolculugu provasi TAMAM.
- .cursorrules/.cursorignore kuruldu; PROTECTED FEATURES + THREE BACKENDS gomulu.
- TODO (landing): logo, screenshots/, early-access backend POST, 7 dil icerigi (Sira-4). Diger acik: Sepet-2 disable patch, Sepet-3 Gmail alias, prod inisi (63d45c4+fca4089).

## 9. FEAT-Connect — B2B API Key & Kota Dashboard KAPANISI (2026-10-12)

Bu dosyanin §2/§3'teki orijinal (v1.0) plani Sayfa 2 icin "durust Yakinda
lansmani" ongoruyordu — ROADMAP.md'nin R3/SIRA-4 TETIK KRITERI (>=5 gercek
B2B/ERP ilgi kaydi gelmeden kodlanmaz) ile tutarli bir temkin karariydi.
**Bu gate Cem'in kendi onayiyla erken acildi** ve ADR-grounded RED→GREEN TDD
ile 4 slice'ta uctan uca teslim edildi (enterprise-backend 158/158, dispatcher
45/45):

- **Slice 1 — Kripto + CRUD:** `lib/apiKeys/*` (generateApiKey/hashApiKey,
  create/list/revoke/authenticate/touchLastUsed). SHA-256 tabanli, plaintext
  anahtar sadece olusturma aninda bir kere gosterilir.
- **Slice 2 — Dual-auth middleware:** `lib/auth/authenticateRequest.js` —
  JWT (dispatcher) VEYA API key (B2B musteri) ile ayni route'a (`assessRoute`)
  erisim; `fastify.authenticateDual`.
- **Slice 3 — Sunucu-maliyeti korumasi:** ozel per-customer rate limiter
  (`lib/rateLimit/*`, auth SONRASI preHandler'da calisir — `@fastify/rate-limit`'in
  varsayilan `keyGenerator`'u auth'tan ONCE calistigi icin musteri bazli
  degil IP bazli limitleyecekti, bu yuzden ozel katman eklendi) + aynı paket
  global IP backstop'u olarak + `lib/cache/ttlCache.js` tarife TTL cache'i
  (anti-scraping: kucuk, hesaplanmis JSON disinda hicbir sey donmez).
- **Slice 4 — Self-servis UI:** `routes/apiKeys.js` (enterprise-backend) +
  dispatcher `src/hooks/useApiKeys.ts` + **`/subscription/b2b-api` sayfasi
  TAMAMEN DEGISTIRILDI** — eski "Yakinda" on-talep akisi (bu dosyanin §2
  Sayfa 2 orijinal tanimi) kaldirildi, yerine anlik (onaysiz) anahtar
  olusturma/iptal + canli kota paneli geldi.

**Kapsam notu (SIRA-4'un 5 kaleminden 2'si teslim edildi):** (1) API Key auth
middleware ✅, (2) kota sayaci ✅. (3) Mollie/iDEAL metered billing, (4) public
`/v1/*` facade (disa plaka→uuid lookup'li ayri yuz), (5) OpenAPI spec+quickstart
— **hala tetiksiz/kapsam disi.** Penetrasyon fiyatlandirmasi (€0.20-0.50/arac/ay,
butce onayi gerektirmeyen frictionless model) sadece mimari baglam olarak
kullanildi; gercek bir billing/odeme implementasyonu YAPILMADI.

Supervizor Musteri Detay panelindeki (Sayfa 4) eski `api_package` talep
satirlarindaki "FEAT-Connect — Yakinda" rozeti artik yanlis oldugu icin
"self-servis aktif, onay gerekmiyor" olarak duzeltildi + `/subscription/b2b-api`
yonlendirme notu eklendi (en/nl/tr, `src/layouts/supervisor/customerDetail/index.tsx`).
Bu satirlar artik yalnizca Slice 4 ONCESI acilmis eski/yetim talepler icin
gorunur ve bir daha islenmeyecektir (self-servis akisi onay beklemez).

Detay: `docs/functions/FEAT-010-automated-exception-handling.md`'deki ayni
oturumda kapanan FEAT-010 ile karistirilmamali — bu, farkli, bagimsiz bir
ozellik (FEAT-Connect, ayri bir FEAT-ID'si yok, bu dosyanin kendi Sayfa 2
kalemi olarak izleniyor). Tam Change Log detayi: `ROADMAP.md` Change Log,
2026-10-12 kaydi.
