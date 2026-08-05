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
- **Kaynak:** `src/layouts/ecommerce/products/edit-product`
- **Islev:** UI layout'u klonlanarak kurulur. EKRANDA SAHTE SAYAC VEYA SIMULE
  EDILMIS KEY GOSTERILMEZ. Sayfa durustce "TulipFleet Connect (FEAT-Connect) —
  B2B API Servisi Yakinda Hizmetinizde" durumuyla kurgulanir. API Key altyapisi
  (uretim/maskeleme/sayac/rate-limit) mustakil FEAT-Connect kalemi olarak
  ROADMAP'e yazilir.

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

### 🟡 Kapsam Muhru (FEAT-Connect)
- Sayfa 1, 3, 4: uctan uca canli, gercek DB/API. Sayfa 2: UI kurulur, durust
  "Yakinda" lansmaniyla durur. API paket talebi ayni subscription_requests
  akisini kullanir (request_type='api_package') — sayac/key motoru FEAT-Connect.

## 4. Faz Plani ve DURUM

| Faz | Icerik | Durum |
|---|---|---|
| S1 | Sema: enterprise.subscription_requests (migration 1783100000000) | ✅ 617fccc — staging'de tablo+pgmigrations kaydi; PROD AYNASI bakim penceresine |
| S2-E1 | Enterprise endpointleri: POST/GET /api/subscription/requests + GET /api/subscription/quota | ✅ kod 0e21557 deploy'lu; SMOKE BEKLIYOR |
| S2-E2 | Ana backend: routes/superadmin.subscriptions.js (bekleyen liste / approve+audit+mail / reject) — STAGING-ONCE | ⬜ |
| S3 | Sayfa 1 + 2 klon/uyarlama (musteri tarafi) | ⬜ |
| S4 | Sayfa 3 + 4 klon/uyarlama (Supervizor) + D-S2 kapisi | ⬜ |
| S5 | Uctan uca smoke (talep->onay->kota->mail) + test verisi temizligi + prod aynasi | ⬜ |

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
