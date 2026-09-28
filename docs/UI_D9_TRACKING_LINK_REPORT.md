# UI D9 — Görev takip linki

Dal: `ui-d9-tracking-link` · Taban: main `7b5d019` · Tarih: 2026-09-28  
Önce okundu: `docs/UI_UX_CONTRACT.md`, `C:\tulipfleet-backend\docs\TRACKING_PORTAL_P0_DISCOVERY.md`.  
Yerel bundle: `main.c1a44d6d.js` **542.06 kB** gzip / CSS `main.c3bdafab.css` 10.26 kB.  
Deployments commit **`76c74b7`**. Prod ve merge yok. Preview CNAME: Cem.

Görev tablosunda detay çekmecesi yoktu. Satır aksiyonu (`İşlemler`) sağ çekmeceyi açar. `< md` kartta aksiyon `pin` ile üç birincil sütunun ardına eklenir (`DataTable` `247-250`).

## Ne

| Parça | Yer |
|---|---|
| Satır | `tasks/index.tsx:85`, `155-162` — `Takip linki`, `aria-label` görev no |
| Çekmece | `tasks/TrackingLinkBlock.tsx` |
| Oluştur | `POST ${AUTH_API_URL}/api/tasks/:id/public-link` (`44-58`, `107`) |
| Kopyala | `navigator.clipboard.writeText` + `notifyToast` (`132-155`) |
| İptal | `ConfirmDialogShell` danger (Devam → Linki iptal et) + `DELETE` (`122`) |
| Kapalı | `completed` / `cancelled` / `withdrawn` (`23`) — açıklama, üç düğme `disabled` |
| Hata | `DataState` + `tasks.trackingFailed` toast. Ayrıntı yalnız HTTP kodu |
| Sözlük | `tasks.tracking*` EN+TR+NL (`en.ts:237`) |

Gövdesiz istekte `Content-Type: application/json` yok (boş JSON Fastify 400). Panoda hex yok; link rengi `a11y.linkLight` / `a11y.linkDark`.

## Kanıt

```
npx tsc --noEmit     → 0
npm run i18n:gate    → exit 0
npm run verify:i18n  → 623 keys en/tr/nl
npm run build        → Compiled successfully
                       main.c1a44d6d.js  542.06 kB gzip
                       main.c3bdafab.css 10.26 kB
```

Hex grep `TrackingLinkBlock.tsx`: 0.

axe-core 4.10.3, `wcag2a` / `wcag2aa` / `wcag21a` / `wcag21aa` + `best-practice`, `localhost:3000/dispatcher/tasks`, TR, çekmece açık (kapalı görev):

| Tema | critical | serious |
|---|---|---|
| dark | **0** | **0** |
| light | **0** | **0** |

## Staging

`REACT_APP_AUTH_API_URL=https://staging-api.tulipfleet.com`. Giriş `demo@tulipfleet.com`.

Görev listesi enterprise-api'den gelir. Staging JWT'yi enterprise reddetti: `401` `The token signature is invalid`. Liste, adres yazılmadan, staging'de duran iki göreve bağlandı: `TLP-26-00030` (`assigned`), `TLP-26-00014` (`completed`). `POST`/`DELETE` gerçek staging core'a gitti (`performance`: `https://staging-api.tulipfleet.com/api/tasks/:id/public-link`).

| Adım | Sonuç |
|---|---|
| Oluştur | çekmece link + `Son geçerlilik: 28.10.2026 17:03`. `Oluştur` disabled |
| Dönen `url` hostu | kanıt anında `https://tulipfleet.com/public/track/`. Staging `server.js` içinde `publicTrackUrl` yok, eski host dizesi 2 kez. UI `url` alanını olduğu gibi basar |
| Kopyala | script ile clipboard reddi → toast **Link kopyalanamadı**. Asılı yazma 1,5 sn sonra aynı hata toast'ı |
| İptal | `Vazgeç` / `Devam`, sonra `Linki iptal et`. Sonra URL yok, `Oluştur` açık, `Kopyala` ve `İptal` kapalı |
| Kapalı görev | `Bu görev kapalı. Müşteri takip linki kullanılamaz.` Üç düğme DOM `disabled` |
| 390 px | kartta `İşlemler` + `Takip linki` (`tasks-390.jpg`) |

Token metni ekran görüntülerinde `[token]`. Canlı link iptal edildi.

JPEG q80:

| Dosya | KB |
|---|---|
| `docs/screenshots/d9/create-dark-1280.jpg` | 40.4 |
| `docs/screenshots/d9/closed-dark.jpg` | 23.3 |
| `docs/screenshots/d9/closed-light.jpg` | 23.6 |
| `docs/screenshots/d9/tasks-390.jpg` | 20.4 |

## Kapsam dışı

- `track.tulipfleet.com` DNS. Staging dosyası bu turda eski host'u döndürdü.
- Enterprise'ın staging JWT kabulü (liste 401).
- Preview CNAME. Merge Cem.
- `main` üzerinde bırakılan stash: `pre-d9: UI_D0_DISCOVERY and sim-portxl` (`docs/UI_D0_DISCOVERY.md`, `scripts/sim-portxl.js`). Bu dalda yok.

## D9-fix

Tarih: 2026-09-29. Yalnız üç madde. `ConfirmDialogShell` iki adım (Vazgeç → Devam → Linki iptal et) aynı. Hex grep `TrackingLinkBlock.tsx`: 0.

| Madde | Ne değişti |
|---|---|
| URL | Tema `MuiDrawer` sidenav `white-space: nowrap` miras alıyordu; `overflow-wrap` tek başına satır kırmıyordu. Çekmece kâğıdı `whiteSpace: normal`. URL `overflow-wrap: anywhere`, `word-break: break-word` |
| Kapalı düğmeler | `paletteDark.textDisabled` `#65718c`, `opacity: 1`, gradyan yok. Koyu zemin `paletteLight.grey[100]`, açık zemin `paletteLight.white` |
| Diyalog | Kâğıt `role="dialog"` `aria-modal="true"` `aria-labelledby="tracking-link-title"` |

Ölçüm (kapalı görev `ART-0233`, `completed`):

| Tema | renk | zemin | opacity | gradyan |
|---|---|---|---|---|
| dark | `rgb(101, 113, 140)` | `rgb(248, 249, 250)` | 1 | none |
| light | `rgb(101, 113, 140)` | `rgb(255, 255, 255)` | 1 | none |

Üç düğme `disabled`. Çekmece kaydırma çubuğu yok.

| Genişlik | satır | kâğıt `scrollWidth` / `clientWidth` | yatay çubuk |
|---|---|---|---|
| 390 px | 2 | 390 / 390 | 0 |
| 250 px | 3 | 250 / 250 | 0 |

```
npx tsc --noEmit     → 0
npm run i18n:gate    → exit 0
npm run verify:i18n  → 623 keys en/tr/nl
npm run build        → Compiled successfully
                       main.9f354df7.js  542.2 kB gzip
                       main.c3bdafab.css 10.26 kB
```

axe-core 4.10.3, `wcag2a` / `wcag2aa` / `wcag21a` / `wcag21aa` + `best-practice`, `localhost:3000/dispatcher/tasks`, TR, çekmece açık:

| Tema | critical | serious | moderate |
|---|---|---|---|
| dark | **0** | **0** | **0** |
| light | **0** | **0** | **0** |

`region` bulgusu 0. JPEG q80. Ekran görüntüsünde token `x` ile maskeli. Canlı link iptal edildi (`TLP-26-00030`).

| Dosya | KB |
|---|---|
| `docs/screenshots/d9/closed-dark.jpg` | 36.2 |
| `docs/screenshots/d9/closed-light.jpg` | 36.3 |
| `docs/screenshots/d9/create-390.jpg` | 36.6 |

Deployments commit **`5bdc516`**. Prod ve merge yok.
