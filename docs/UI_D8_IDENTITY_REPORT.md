# UI D8 — Kimlik, ack kalıcılığı, Optimize mock, e-posta varsayılanı

Dal: `ui-d8-identity` · Taban: main `4df8189` · Tarih: 2026-09-27  
Yerel bundle: `main.24d7b9ce.js` **536.52 kB** gzip (+1.05 kB) / CSS `main.4800285c.css` 10.21 kB.  
Deployments commit **`f46d0b9`** (Pages hash yerel hash’ten farklıdır). Preview CNAME: Cem.

`SUPERVISOR_API_URL` **değiştirilmedi** (varsayılan `https://staging-api.tulipfleet.com`).

---

## B) Navbar kimlik

Kaynak: `useUserProfile` → `GET ${AUTH_API_URL}/api/user/profile`.

| Durum | Ad | Rol | Şirket |
|---|---|---|---|
| 200 | `firstName`+`lastName` (alias `first_name`/`last_name` + `user` sarmalayıcı) | sözlük `nav.role.*` | `company_name` |
| ad yok | e-posta | sözlük | `company_name` veya `—` |
| **404** (core A prod’da yokken) | JWT `email` | JWT `role` → sözlük | **`—`** (`common.emptyDash`) |

JWT decode: `atob` payload, yeni paket yok. `placeholderData` aynı JWT profili — ilk boyada boş flaş yok.

Settings **BasicInfo** aynı hook (`["user-profile"]`). `demo@tulipfleet.com` oturumunda prod profil **200**: e-posta doldu, ad/soyad boş, şirket **Dobbe Transport**, rol `company_admin` → TR **Şirket yöneticisi**.

390 (`<sm`): kimlik metni `display: none`; avatar + hesap menüsü. Menü başında aynı üç satır (`role=group` + `nav.identityAria`). JPEG: `docs/screenshots/d8/navbar-390.jpg` (69.5 KB).

Rol anahtarları: `nav.role.company_admin` / `super_admin` / `driver` (EN+TR+NL). Bilinmeyen rol ham string.

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

X (`dismissBanner`) sunucuya yazmıyordu; Onayla resolve dener ama başarısız/yenilemede `dismissedRef` bellek-içi olduğu için banner geri geliyordu.

### Geçici bağ

`localStorage` anahtarı **`tf.alerts.acked`**: `{ ids: string[], exp: number }`, TTL **7 gün** (her yazımda kayar). X ve Onayla: `banner:*` / `family:*` / `ex:` / `al:` / ham id. Yüklemede `dismissedRef = loadAckedIds()`.

**Not — sunucu ack endpoint’i gerekli.** `PUT /api/alerts/:id/ack` (veya resolve’un dismiss ile aynı semantikte zorunlu başarı) olmadan ack tarayıcıya kilitli; başka cihaz / gizli sekme / 7 günden sonra banner geri gelir. Exception `acknowledge` enterprise’da duruyor; alert tarafında eşdeğer ack yok.

---

## E) `SUPERVISOR_API_URL` — etki, değişiklik yok

Varsayılan: `https://staging-api.tulipfleet.com` (Milestone-0, `.cursorrules`).

Tüketen ekranlar (yalnız `src/layouts/supervisor/**`):

| Ekran | Çağrılar |
|---|---|
| `SupervisorGate` | `POST /api/auth/login` — `super_admin` JWT |
| Supervisor listesi | `GET /api/superadmin/companies`, `GET /api/superadmin/subscriptions/requests?status=PENDING_APPROVAL` |
| Müşteri detayı | aynı GET + `POST .../requests/:id/{approve\|reject}` + `PUT .../companies/:id/quota` |

**Komuta Merkezi prod core’a (`api.tulipfleet.com`) bakarsa:** gate ve abonelik kuyruğu **prod** şirket/istek yazar; staging-only kayıtlar kaybolur; staging JWT secret uyumsuzluğu biter (prod token ile local enterprise zaten eşleşiyor). Dispatcher operasyon ekranları (harita, görev, ayarlar) **etkilenmez** — onlar `AUTH_API_URL` / `ENTERPRISE_API_URL`. Karar Cem.

---

## H) Optimize mock uyarısı

`optimize.mockBanner` (EN+TR+NL):

- EN: *HERE Tour Planning was not implemented; the mock uses the selected vehicles (b1374ab).*
- TR: *HERE Tour Planning yapılmadı; mock, seçilen araçları kullanır (b1374ab).*
- NL: *HERE Tour Planning is niet gebouwd; de mock gebruikt de geselecteerde voertuigen (b1374ab).*

---

## Ek) `dispatcher@tulipfleet.nl`

**Kaynak: sabit (FE), DB değil.**

| Yer | Önce | Sonra |
|---|---|---|
| `EmailIntegration` `useState` | `"dispatcher@tulipfleet.nl"` | `""` |
| aynı, `placeholder` | aynı .nl | `settings.emailPlaceholder` = `info@tulipfleet.com` |
| Navbar mailto | aynı .nl | `info@tulipfleet.com` |

Kayıtlı değer varsa `GET ${ENTERPRISE_API_URL}/api/dispatcher/notification-preferences` → `preferences.notification_email` (DB). `demo@` oturumunda alan **boş**, placeholder `info@tulipfleet.com`. `src/` içinde `tulipfleet.nl` kalmadı.

---

## Kanıt

```
npx tsc --noEmit          → 0
npm run i18n:gate         → ok
npm run verify:i18n       → 604 keys en/tr/nl
npm run build             → Compiled successfully
```

axe-core 4.10.3, WCAG 2.1 A/AA, `localhost:3000`, TR, `demo@tulipfleet.com`:

| Ekran | Light crit/ser | Dark crit/ser |
|---|---|---|
| Login | **0 / 0** | **0 / 0** |
| Live map | 0 / 1 (`list` ul>div, panel) | 0 / 2 (`list` + `Araçlar` contrast #7c3aed/#1a2035) |
| Tasks | **0 / 0** | **0 / 0** |
| Settings | **0 / 0** | **0 / 0** |

Live map ihlalleri **kimlik alanı değil** (harita paneli `Araçlar` + `MuiList`); D8 kapsamı dışı. Identity `role=group` axe’e düşmedi.

390: kimlik `display:none`; Hesap menüsü e-posta + rol + şirket. `docs/screenshots/d8/navbar-390.jpg`.

Hex: yeni dosyalarda yok. `SUPERVISOR_API_URL` satırı aynı.

---

## Kapsam dışı

- Live map `list` / `Araçlar` contrast (önceden var).
- Core `GET /api/user/profile` prod deploy (bu turda 200 görüldü; 404 yolu duruyor).
- `PUT /api/alerts/:id/ack` (yok — localStorage geçici).
- SUPERVISOR host kesimi.
- `scripts/sim-portxl.js`, `docs/UI_D0_DISCOVERY.md` commit edilmedi.
