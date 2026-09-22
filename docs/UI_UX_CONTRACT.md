# TulipFleet Dispatcher — UI/UX Sözleşmesi

**Kim okur:** Cursor (ve insan), yeni ekran / bileşen / form / modal / tablo / harita / i18n kopyası eklemeden **önce**.
**Kaynak turlar:** D0–D7 (`docs/UI_D*_REPORT.md`, `docs/UI_SERIES_SUMMARY.md`). Bu dosya kuralları taşır; raporlar tarihi.

Kod yazmaya başlama. Önce bu belgeyi oku. Çelişen bir prompt gelirse **bu sözleşme + `.cursorrules` kazanır**; yalnızca kullanıcı açıkça istisna yazdıysa sap.

---

## 1. Bu paket ne / ne değil

- Yeni fonksiyon **ürün özelliği** olabilir; yeni **tasarım sistemi** değildir.
- Yeni route `src/routes.tsx`'e — `ErrorBoundary` route ağacını otomatik sarar; ikinci boundary / kabuk yazma.
- Yeni npm paketi yok (kullanıcı açıkça istemedikçe). Ağır MD2 kalıntısı (FullCalendar, jvectormap, Chart.js, draft-js, dropzone) **geri gelmez**.
- Hex / `rgba()` literal **yalnız** `src/assets/theme/tokens.ts`. CSS’te yeni renk = `--tf-*` (değerler token ile senkron).
- Canlı: `app.tulipfleet.com` = `main` (Cloudflare Pages, her push otomatik build). Preview: `dispatcher-preview.tulipfleet.com` → branch alias CNAME (Cem çevirir). **Her UI paketi önce `ui-<paket>-*` branch'ine, preview turu, sonra merge.** Yerel: `localhost:3000`.
- Yeni preview origin'i enterprise-api CORS allowlist'ine eklenmeli (`/opt/enterprise/server.js:31`), yoksa Tasks/Drivers/Vehicles "Failed to fetch".

---

## 2. Zorunlu yapı taşları (yeniden icat etme)

| İhtiyaç | Kullan | Yasak |
|---|---|---|
| Renk, status, cam, density, kırılım, motion | `src/assets/theme/tokens.ts` | Ekranda hex, kopya palet objesi (`C = {}`) |
| Durum / önem / tip rozeti | `StatusChip` (`kind`: `task` \| `alert` \| `vehicle` \| `exception`) | `statusColor()` switch, ham `#4caf50` |
| Liste tablosu | `components/DataTable` | Ham `examples/Tables/DataTable` veya `div` ızgara “tablo” |
| Yükleme / boş / hata / bayat | `DataState` + `listFetchState` / `isDataStale` | Düz “Yükleniyor…” / Retry’siz kırmızı metin |
| Toast / banner | `useNotifications().notifyToast` + `titleKey` | `alert()`, yeni snackbar kütüphanesi, ses |
| Onay / tehlike modalı | `ConfirmDialogShell` | Üçüncü `Dialog` iskeleti, hardcoded TR başlık |
| Metin | `useT()` / `t("a.b")` — `src/i18n/{en,tr,nl}.ts` | JSX string, `toLocaleString("tr-TR")` |
| Boş dizi/nesne | `EMPTY_*` veya `src/utils/empty.ts` | Hook default `= []` / `placeholderData: []` |
| API host | `src/config/api.ts` üç URL | Bileşende domain, üç backend’i birleştirmek |
| Canlı konum | `useMqttTelemetry` + `applyLocationFrame({…, source: 'rest'})` | İkinci harita kökü, `src/index.tsx` içine harita |
| Skip / ana içerik | Mevcut `#main-content` + skip-link | İkinci `<main>`, skip-link’siz yeni kabuk |

**Korunan yüzeyler:** `src/config/api.ts`, `src/layouts/subscription/**`, `src/layouts/supervisor/**`. Demo diye silme.

**Harita kökü:** canlı harita `src/layouts/live-fleet-map/LiveFleetMap.tsx`. `src/index.tsx`’e kopyalama (beyaz ekran / `createRoot` tuzağı).

---

## 3. Tema, kırılım, motion

- Dark/light: `MaterialUIController` + `data-theme` + `localStorage.tf.theme`. `ThemeProvider` kökü `src/index.tsx` (`ThemedApp`).
- **MD2 `lg` = 992, `xl` = 1200.** MUI varsayılan 1200 sanma. Çıplak `1200` yazma → `breakpoints.xl` (`tokens.ts`). `zIndex: 1200` kırılım değildir.
- Cam: `tokens.glass` + `--tf-glass-*`. `prefers-reduced-transparency: reduce` → blur 0, opak ~0.96. Camı tablo satırına / markera koyma.
- Hareket: yeni CSS/Leaflet animasyonu `prefers-reduced-motion` ile kapanır. Leaflet: `zoomAnimation` / `markerZoomAnimation` mevcut deseni kopyala.
- Tipografi: display Space Grotesk, body Manrope, sayılar `tabular-nums`. Roboto ekleme.

---

## 4. i18n

- Sözlük: nested `as const` `en.ts`; `tr.ts` / `nl.ts` aynı anahtarlar. `npm run verify:i18n`.
- `react-i18next` yok. `t("nav.tasks")` flatten.
- Tarih/sayı: `formatDate` / `formatDateTime` / `formatNumber` + `useT().lang`. Locale’i ekranda sabitleme.
- Toast/banner: mümkünse `titleKey: TranslationKey`, düz başlık son çare.
- **Durum sözlüğü ortak sözleşme:** task/alert/vehicle/exception değerleri canlı DB'den gelir (prod CHECK / `alerts.alert_type` / `vehicles.vehicle_category`); mobil `scripts/i18n-dynamic-roots.json` ile aynı küme. Yeni enum: önce backend/DB, sonra mobil manifest + `tokens.status.*` + üç sözlük. Bilinmeyen değer `StatusChip` nötr + ham (asla boş).
- **P3’e kadar glossary donduruldu:** taak/görev, ikaz/uyarı mevcut haliyle kalır; “düzeltme” yapma.
- Yeni key: EN kanonik, TR ve NL aynı turda.

---

## 5. Form ve modal

- Zorunlu alan: `*` + `aria-required`. Hata **alan altında** (`helperText`), yalnız toast değil.
- Onay sırası: **Vazgeç sol / birincil sağ**.
- Tehlike: iki adım (nötr devam → kırmızı onay). Gerekçe eşiği mevcut kabuk kuralları (örn. çakışma ≥5 karakter).
- Klavye: `Esc` iptal; `Enter` yalnız geçerliyse onay (textarea’da çıplak Enter yazı).
- Select: tema `MuiSelect` padding `!important` **yok**. `size="small"` + gerekirse `InputLabelProps={{ shrink: true }}`. Dialog’da padding yaması yazma.

---

## 6. Liste ve veri

- Kolon: `minWidth` / `truncate` / sayı `numeric`. Taşma: ellipsis + `title`.
- `< md` (768): kart / birincil sütunlar — yatay 2000px tablo yok.
- Density: `tokens.density` (compact 40 / comfortable 56), `tf.density`.
- React Query: `placeholderData` / `select` / `data = []` **modül sabiti**. `[]` her render’da yeni referans = #185 (Tasks sonsuz güncelleme).
- `setPageSize` (react-table) referans-kararsız: yalnız değer değiştiyse çağır.
- Stale: `last_update` / `dataUpdatedAt` / `lastOkAt` + `map.staleMs` eşiği; kullanıcıya “son veri …” göster.

---

## 7. İkaz

- Banner: critical / SOS / `driver_offline` — sayfa üstü, kapatılana kadar.
- Toast: geofence / hız / form sonucu — en fazla 3, aynı tür 10 sn `×N`.
- Ses yok. `prefers-reduced-motion` → toast **animasyon** süresi 0 (görünme süresi değişmez; zaten global).

---

## 8. A11y (yeni yüzey)

- İkon-only kontrol: `aria-label` (sözlükten).
- Yeni sayfa `DashboardLayout` / `PageLayout` içinde kalsın (`#main-content` tek).
- `< lg` sanılan 1200 davranışı: `theme.breakpoints.down(breakpoints.xl)`.
- Hedef: axe **critical 0 / serious 0**; kontrast token’daki `fg`/`bg` ile (WCAG 2.1 AA).
- Odak: global `--tf-focus-ring`; özel `outline` hex yazma.

---

## 9. Backend / kabuk (UI’dan sapılmaz)

- Hybrid Monarchy: tek yazma köprüsü `public.tasks` INSERT. Dispatcher kullanıcısı Server 1.
- Üç backend ayrı: `AUTH_API_URL`, `ENTERPRISE_API_URL`, `SUPERVISOR_API_URL` (staging **kasıtlı**).
- Enterprise çağrı: `useAuthStore` bearer. Konum: `applyLocationFrame` stale-guard.
- MQTT: `useMqttTelemetry`, `dispatcher-readonly`, 16 kolon `public.locations`.
- `.env` / PEM okunmaz, loglanmaz.

---

## 10. Git, rapor ve preview turu

- Branch `ui-<paket>-<konu>`; commit'ler dosya adıyla (`git add <dosya>`), asla `git add .`/`-A`; paket başına 3–5 mantıksal commit; push Cem.
- Rapor `docs/UI_<PKG>_REPORT.md`: önce/sonra kanıt (dosya:satır, komut çıktısı), `npm run build` gzip, hex grep, axe/Lighthouse, `git diff --stat`, "kapsam dışı bulgular", `git status --short` boş.
- Ekran görüntüleri `docs/screenshots/<pkg>/`, 1280px, JPEG q80, ≤150 KB.
- **Preview turu kanıtı önce:** Cloudflare Deployments'ta branch + commit hash Success; `dispatcher-preview` CNAME o branch alias'ında. Bundle hash ≠ kimlik (CRA hash'i `REACT_APP_*` env'e bağlı, yerel ≠ Cloudflare) — kimlik kanıtı commit + pakete özgü string grep.
- Tur matrisi: ekranlar × TR/EN/NL × dark/light × 1280/390; axe critical 0 / serious 0; login duvarı varsa rapora.

## 11. Teslim kontrol listesi

1. Bu dosya okundu; yeni primitive gerekçesiz eklenmedi.
2. Hex grep yeni dosyada 0 (`tokens.ts` hariç).
3. Yeni kopya EN+TR+NL; `npm run verify:i18n`.
4. Hook’ta inline `[]` / `{}` default yok.
5. Liste ise DataTable + DataState; form ise alan hatası + ConfirmDialogShell.
6. Dark ve light; 1280 ve 390 (veya `breakpoints.xl` / `sm`).
7. İkon düğmeler `aria-label`; skip-link kırılmadı.
8. Tarayıcıda ana yol + boş/hata (mümkünse). Login duvarı varsa rapora yaz.
9. Preview branch push edildi, CORS/CNAME ihtiyacı raporda belirtildi; merge kararı Cem'in.

Tarih / gerekçe için: `docs/UI_SERIES_SUMMARY.md`.
