# TulipFleet Dispatcher — D5: Form / Modal Disiplini + i18n P2

**Branch:** `ui-d5-forms` (`main` `61fb58b` üzerinden)
**Kapsam:** Modallar, Optimize/Approve (ayrı Task-detail route yok — form + onay bu ekran), Exceptions içi metinler, Settings formları, doğrulama. Liste tabloları / canlı harita / kabuk (navbar/sidenav) **dokunulmadı** (Vehicles `emission_class` rozeti D4 §7 kapanışı için istisna).
**Yeni npm paketi:** Yok.
**Hex literal:** JS/TS kaynakta yalnız `src/assets/theme/tokens.ts`.
**Sözlük:** typed flatten `src/i18n/{en,tr,nl}.ts` (react-i18next yok). Base EN. Glossary (taak/görev, ikaz/uyarı) P3’e kadar mevcut terimler.
**Push:** Yok (Cem).

---

## 1. Yönetici özeti

1. **i18n P2.** D0 kritik bulgu 2 (3 modal + `exceptions/index.tsx` hardcoded TR, `:150` `"tr-TR"`) ve D2 Settings EN etiketleri + Optimize kopyası sözlüğe taşındı. `"tr-TR"` sabitleri `formatDateTime` / `LOCALE_BY_LANG` (`src/i18n/index.ts`). `npm run verify:i18n` → **509 key**, EN/TR/NL union eşleşmesi.
2. **Modal standardı.** `ConfirmDialogShell` token’lı light/dark chrome (`tokens.dialog`). Yapı: başlık (display) + gövde + opsiyonel gerekçe. Buton sırası **Vazgeç sol / birincil sağ**. Tehlikeli aksiyon: ilk adım nötr (`dialog.continue`, accent), onay adımı kırmızı. `Esc` kapatır; `Enter` yalnız gerekçe geçerliyse onaylar (textarea’da çıplak Enter yazı, Ctrl/Meta+Enter onay). Odak: MUI Dialog tuzağı + gerekçe `autoFocus`. `aria-labelledby` / `aria-describedby`. `submitting` → spinner + disabled.
3. **Form dili.** Optimize pickup/dropoff/vehicles hata metni **alan altında** (toast değil). Zorunlu `*` + `aria-required`. Sayı `parseDecimal` (NL/TR virgül) + `tabular-nums`. Başarı/hata `notifyToast` (D4 kuyruğu). 409 çakışma `ConflictOverrideModal` (≥5 karakter gerekçe).
4. **`emission_class`.** `vehicle.emission.*` (`euro_0`…`euro_7`, `euro_vi`, `zero_emission`, `n_a`). Bilinmeyen ham (`enumLabel`). Kanıt: `docs/SCHEMA_REFERENCE.md` CHECK + ROADMAP migration `1781700000000` (canlı enterprise-api `.env` okunmadı).

---

## 2. D0 / D2 / D4 kapananlar

| Bulgu | Durum |
|---|---|
| D0 C3 — ConflictOverrideModal / OverrideReasonDialog / BulkConfirmDialog hardcoded TR | `t("conflict.*")` / `t("override.*")` / `t("bulk.*")` + `overrideReason.*` |
| D0 kritik 2 — exceptions hardcoded TR + `:150` `"tr-TR"` | `t("exceptions.*")` + `formatDateTime`; `toLocaleString("tr-TR")` **0** |
| D0 C3 — ConfirmDialogShell 15 hex | `tokens.dialog`; kapsam hex **0** |
| D2 §8.4 — Settings Basic Info EN | `settings.*` (BasicInfo, ChangePassword, EmailIntegration, DeleteAccount, Sidenav) |
| D2 §8.7 — ConfirmDialogShell hex sızıntısı | Token’landı |
| D4 §7 — `emission_class` ham (`zero_emission`, `euro_6*`) | `enumLabel("vehicle.emission", …)` |
| D2 Optimize VRP / mock açıklaması TR | `optimize.mockBanner` (EN baz, TR/NL çeviri) |

Ayrı **Task detail** route yok. Optimize = form + kanban onay yüzeyi.

---

## 3. Adım 1 — Envanter ve göç

### 3.1 Tarama (göç öncesi, kullanıcıya görünen)

Kapsam: `src/layouts/**` + `src/components/**`. Yorum, `console.*`, stored enum **değerleri**, MD2 demo şablonları “kapsam dışı”.

| Dosya:satır (D0 / D5 tarama) | Metin | Key |
|---|---|---|
| `exceptions/index.tsx` ~176 | İstisna Yönetimi (İkaz) | `exceptions.title` |
| aynı ~156–262 | Onayla / Çöz / Vazgeç / Kaydediliyor… | `exceptions.acknowledge` / `resolve` / `common.cancel` / `exceptions.saving` |
| aynı ~38–51 | ETA Gecikmesi, Sürücü Çevrimdışı, RESOLVE_OPTIONS TR | `status.exception.*` / `exceptions.action.*` |
| aynı ~150 | `toLocaleString("tr-TR")` | `formatDateTime` |
| `ConflictOverrideModal` ~69–131 | Zaman Penceresi Çakışması, Riski Onayla…, gerekçe placeholder | `conflict.*` |
| `OverrideReasonDialog` ~76–84 | Öneri dışında araç… | `override.*` |
| `decisionLog.ts` OPTION label’ları | Sürücü bölgeyi tanır… | `overrideReason.*` (değerler aynı enum) |
| `BulkConfirmDialog` ~41–45 | Toplu Görev Oluşturma / Gönderiliyor… | `bulk.*` |
| `optimize/index.tsx` Alert + form | Mock VRP TR, Alım/Teslim, Optimize, Onayla, KPI | `optimize.*` |
| aynı hazmat/skill UI | Sınıf n, ADR Lisansı (gösterim) | `optimize.hazmatClass` / `skillAdr`… — **stored** `Sinif 1` / `ADR Lisansi` değişmedi |
| `vehicles/index.tsx` rozet | ham `euro_6` / `zero_emission` | `vehicle.emission.*` |
| Settings BasicInfo/ChangePassword/Email/Delete/Sidenav | First name, Save, Delete account… | `settings.*` |
| Optimize/Settings başarı-hata | toast yok / Alert | `notifyForm.*` + alan `helperText` |

**Göç sonrası (kapsam içi JSX literal):** `t(` / helper dışında kullanıcı metni **0**. `src/layouts/dispatcher` + üç modal + Optimize + Settings form dosyalarında `"tr-TR"` **0**.

Kullanıcıya görünmeyen (kapsam dışı): dosya-başı yorumlar, `optimize/index.tsx` tarihçe yorumundaki “Gerekceli Onay”, `Authentication/index.tsx` (D2’de Settings’ten çıkarıldı, import yok).

### 3.2 Locale helper

`LOCALE_BY_LANG`: `en → en-US`, `tr → tr-TR`, `nl → nl-NL`.

Yeni: `formatDurationMinutes`, `parseDecimal` (NL/TR `,` ondalık; EN grouping virgülü siler).

### 3.3 `emission_class` kanıt

Canlı `GET /api/dispatcher/vehicles` bu turda çağrılmadı (`.env` / token okunmaz). Sözleşme:

- `docs/SCHEMA_REFERENCE.md` `public.vehicles`: CHECK `euro_0`..`euro_6`, `euro_vi`, `euro_7`, `zero_emission`.
- ROADMAP Sıra 3 migration `1781700000000`: aynı küme, NULL ok.
- FEAT-008 notu: prod CHECK alt çizgili `euro_6` (spec’teki `euro6` değil).

Sözlük: `vehicle.emission.euro_0` … `euro_7`, `euro_vi`, `zero_emission`, `n_a`. `enumLabel` bilinmeyeni ham basar.

### 3.4 Verify

`scripts/verify-i18n.ts` — flatten key union, bağımlılık yok. `package.json`: `"verify:i18n": "node --experimental-strip-types scripts/verify-i18n.ts"`.

```
[verify-i18n] ok — 509 keys in en/tr/nl
```

---

## 4. Adım 2 — Modal standardı

`src/components/ConfirmDialogShell/index.tsx` + `tokens.dialog` (`danger` / `warning` / `accent` + `dark` / `light` chrome).

| Kural | Uygulama |
|---|---|
| Vazgeç sol, birincil sağ | `flex:1` outline + `flex:2` gradient |
| Danger iki adım | `needsArm`: ilk `dialog.continue` + accent; sonra kırmızı `confirmLabel` |
| Esc | `onKeyDown` + MUI `onClose`; `submitting` iken `disableEscapeKeyDown` |
| Enter | gerekçe `reasonOk` değilse yok; textarea çıplak Enter yazı |
| Odak tuzağı | MUI Dialog; gerekçe `autoFocus` |
| ARIA | `aria-labelledby={titleId}`, `aria-describedby` subtitle varsa |
| Spinner | `CircularProgress` + `submittingLabel` / `dialog.submitting` |

Üç modal + Exceptions çözüm diyaloğu bu kabuğa alındı. ConflictOverrideModal `reason.minLength: 5` korunur.

`SHELL_C` yalnız CopyChip geriye dönük dark varsayılan (deprecated).

---

## 5. Adım 3 — Form dili

**Optimize** (`src/layouts/dispatcher/tasks/optimize/index.tsx`):

- Etiket / yardımcı / mock banner / KPI / kanban / çakışma satırı `optimize.*`.
- Pickup / dropoff `LocationSearchInput` `required` + `aria-required` + `helperText={fieldError.*}`.
- Vehicles hata satırı alan altında; grup `aria-label` (role=group üstünde `aria-required` yok — axe `role-supports-aria-props`).
- Hacim/ağırlık `parseDecimal` + `tabular-nums`.
- Approve başarı `notifyToast`; 409 `ConflictOverrideModal`.

**Settings:** BasicInfo / ChangePassword / EmailIntegration / DeleteAccount / Sidenav. ChangePassword hata `helperText` (toast değil). DeleteAccount danger kabuk + şifre `MDInput` (multiline reason değil). Toast: `notifyForm.saved` / `saveFailed` / `passwordUpdated`.

**`notifyToast`:** `useNotifications` — mevcut D4 toast kuyruğu (`MAX_VISIBLE_TOASTS` 3).

---

## 6. Doğrulama

| Kontrol | Sonuç |
|---|---|
| Kapsam içi kullanıcı literal (göç sonrası) | **0** (yorumlar hariç) |
| `"tr-TR"` / `toLocaleString("tr-TR")` dispatcher layouts + modallar | **0** |
| Hex grep: ConfirmDialogShell, 3 modal, optimize, exceptions, settings form, LocationSearchInput | **0** |
| `npm run verify:i18n` | **509 keys** ok |
| `npm run build` | gzip **530.59 kB** `main.73f0baa1.js` (D4 521.47 kB, **+9.12 kB**), CSS 10.05 kB |
| ESLint yeni | Optimize `useCallback` `lang` deps (satır 811). Kabuk `dispatch` uyarıları önceden vardı |
| axe Optimize / Exceptions / Settings critical/serious | **Oturum yok** — `localhost:3000/dispatcher/tasks` login formu (NL). Demo e-posta dolu, şifre yok; `.env` okunmadı. Canlı axe Cem oturumu ile |
| Modal klavye (Tab döngüsü, Esc) | Kod: MUI trap + Esc/Enter sözleşmesi §4. Canlı tuş turu oturum gerektirir |
| 3 dil × 2 tema ekran görüntüsü | Aynı neden; kolaj yok |
| `git diff --stat 61fb58b...HEAD` | 22 dosya, yalnız kapsam + i18n + `tokens.ts` (`dialog`) + `verify-i18n` + `package.json` script |
| Push | **Yok** (Cem) |

### Tarayıcı notu

Yerel CRA ayaktaydı. Dispatcher oturumu login’de (dil **NL**: Taal / E-mail / Wachtwoord / inloggen). D4’teki gibi demo giriş otomasyonu bu turda kullanılmadı. Canlı oturumda: Optimize form validasyonu (adres seçmeden submit → alan altı hata); Vehicles emission rozeti; Exceptions Çöz → kabuk; Settings şifre uyumsuzluğu `helperText`; ConflictOverride ≥5 karakter + Esc; dark/light + EN/TR/NL.

---

## 7. NL SUSPECT

P3 glossary kararı bekler. Şüpheli / borçlu İngilizce veya domain terimi:

| Key | NL metin | Not |
|---|---|---|
| `optimize.directionOutbound` | Levering (outbound) | İngilizce parantez |
| `optimize.directionInbound` | Retour / ophalen (inbound) | aynı |
| `optimize.hazmatTitle` | Hazmat-klassen (ADR) | ADR doğru; “Hazmat” EN jargon |
| `optimize.hazmatNone` | Geen hazmat | aynı |
| `optimize.exemptionNeeded` | Ontheffing vereist | NL hukuki terim — muhtemelen doğru |
| `optimize.zeCompliant` | ZE-conform | ZE = zero emission jargon |
| `settings.alertZe` | ZE-zone (zero-emissie) | landing/mobil ile hizalı |
| `status.exception.compliance_zone_breach` | ZE-zone-inbreuk | aynı |
| `vehicle.emission.zero_emission` | Zero-emissie | hibrit |

TR `outbound`/`inbound` parantezleri de borç (stored metadata değerleri değil, UI).

---

## 8. Kalan ham / kapsam dışı

| Öğe | Neden |
|---|---|
| Hazmat/skill **stored** `Sinif 1`, `ADR Lisansi` | Backend sözleşmesi; yalnız gösterim map’i `optimize.hazmatClass` / `skill*` |
| Bilinmeyen `emission_class` | `enumLabel` ham + D4 `console.warn` deseni |
| Liste tabloları, harita, navbar/sidenav | Spec dokunulmaz |
| `Authentication/index.tsx` TR “Yakında” | D2 Settings’ten çıkarılmış ölü dosya; import **0** |
| `scripts/sim-portxl.js`, `docs/UI_D0_DISCOVERY.md` | Bu branch’e ait değil, commit edilmedi |

---

## 9. Commit’ler (push yok)

D5:
1. `1bc1046` — `i18n: migrate modal, exception, emission and locale strings`
2. `2c11d73` — `fix(ui-d5): tokenise ConfirmDialogShell and wire three modals`
3. `3bfc58d` — `i18n: Optimize, Settings form copy and field validation`
4. `21e80c1` — `docs: UI_D5_REPORT.md form/modal i18n P2`

D5-fix (preview `addf81db`):
5. `5067fda` — React #185 blocker
6. `5e14edd` — Resolve + Optimize
7. `a5cda89` — Settings helperText + i18n kaçakları
8. `8fa85ca` — kontrast token’ları
9. Bu rapor §7

---

## 7. Preview turu + D5-fix (bundle addf81db)

Kaynak: preview. Yeni paket yok. Push yok. Hex yalnız `tokens.ts`.

### 7.0 BLOCKER — React #185 (`/dispatcher/tasks`, EN+dark)

**Kök neden.** D2 reducer bail-out (`setLayout` aynı değerde aynı state nesnesi) bu yolu kapatmadı. Tasks soğuk yüklemede `useDrivers()` / `useVehicles()` `data` henüz `undefined` iken `const { data: drivers = [] }` **her render’da yeni dizi** üretiyordu → `driverNameById` / `plateById` / `table` `useMemo` kırılıyordu → `DataTable` `useTable` yeniden kuruluyordu → react-table `setPageSize` **referans-kararsız** →

```ts
useEffect(() => { setPageSize(defaultValue); }, [defaultValue, setPageSize]);
```

her render’da `setState` → Maximum update depth (#185).

`useTasks`’te `select` yoktu (aday doğrulanmadı). `placeholderData: EMPTY_TASKS` eklendi. Notifications `setBanners(next)` her poll’da yeni dizi + `useExceptions.setExceptions(rows)` aynı snapshot’ta bile yeni referans — 20 sn’de bir ekstra render; döngüyü **başlatmaz**, yarış penceresini **genişletir**. Density fallback her çağrıda yeni nesne üretiyordu (`useDensity` provider dışındaysa).

**Neden aralıklı / EN+dark.** Döngü yalnız `data === undefined` penceresinde (ilk fetch veya cache boş). Cache doluysa (`staleTime` 2 dk) `?? EMPTY_*` kullanılmaz, tablo referansı durur. EN+dark: varsayılan dil + saklı dark — soğuk ilk boyama. Profiler “why did this render”: parent `table.columns` kimliği + `setPageSize` effect.

**Düzeltme (minimal):**
- Tasks: `EMPTY_DRIVERS` / `EMPTY_VEHICLES` / `TASKS_PAGE_SIZE` (Vehicles D2 deseni)
- `useTasks.placeholderData = EMPTY_TASKS`
- DataTable: `setPageSize` yalnız `pageSize !== next`; deps’ten `setPageSize` çıkarıldı
- `useExceptions` / banner store: snapshot eşitse aynı referans
- `useDensity` fallback sabit nesne

**ErrorBoundary “Yeniden dene”.** Zaten vardı: `t("error.retry")` + `setState({ hasError: false })` çocukları tekrar render eder. D5-fix: `generation` key ile **route ağacı remount**. `App.tsx` her route’u `ErrorBoundary` ile sarıyor.

10× EN/TR/NL × dark/light giriş: oturum yok (login). Kod kanıtı yukarıda; canlı 10× Cem.

### 7.1 Exceptions → Resolve

- Yorum **opsiyonel** (ConflictOverride ≥5 buraya taşınmadı).
- `Enter` textarea newline; `Ctrl/Cmd+Enter` kabuk onayı. İpucu `exceptions.commentHint` / `dialog.submitHint`.
- `onCancel` taslağı siler (`comment` + `action`).
- `aria-modal="true"` kabukta açık.
- Action select `InputLabelProps={{ shrink: true }}` — label çakışması.
- ACKNOWLEDGE/OPLOSSEN: `size="small"`; `< md` ikon-only + `aria-label`; `≥ md` ikon + metin.

### 7.2 Optimize formu

- Pickup/drop-off: `error` + `helperText` + `aria-invalid`. Helper rengi `form.errorFgLight` `#B71C1C` / `errorFgDark` `#FF8A80` (beyaz 6.57:1; dark panel 7.07:1).
- `parseLocaleNumber(value, locale)` tek kaynak. EN yalnız `.` (`1,5` geçersiz, 15 olmaz). TR/NL yalnız `,`. Mesaj `optimize.errorDecimalDot` / `errorDecimalComma`.
- Volume/Weight zorunlu değil — etikette `*` yok.

### 7.3 Settings helperText + toast

**Neden görünmüyordu:** `MuiFormHelperText` `display:none` değil (tema override yok). `FormField` `{...rest}` geçirir. Çağıranlar (`BasicInfo`, `EmailIntegration`, `ChangePassword` çoğu alan) **`helperText` prop’unu hiç vermiyordu**. Şimdi her alanda `settings.help*`.

Toast: `NotificationHost` → `MDSnackbar` `role="status"` + `aria-live="polite"` (tek yer).

TR başlık varsayılan: `nav.tenantSettings` = **“Şirket ve Sistem Ayarları”** (P3’e kadar). “System default” radyo: `alignItems: flex-start`, ikon sarmalayıcı kaldırıldı.

### 7.4 i18n kaçakları

- `/optimization/tour-planning` gövdesi `tourPlanning.*`.
- Breadcrumb `dispatcher` → `nav.dispatcher` (TR “Sevk”).
- Banner/toast başlığı `titleKey`; dil değişince `t(titleKey)` yeniden. Gövde backend ham kalır.
- `MDBadge` `text-transform: none` (emission “Euro 6”).

**BACKEND (dokunulmadı):** toast/banner `body` alanları API’den gelir — örn. `A2 otoyolu…`, `Görev başladı`, `a.description` / `e.detection_payload` serbest metin. Şablon: `bodyForAlert` / `bodyForException` (kod) + backend string (parametre). Mesaj şablonu BE’de; FE çevirmez.

### 7.5 Kontrast (WCAG 2.1, hesaplı)

| Token / yüzey | Eski → yeni | Zemin | Oran |
|---|---|---|---|
| `badgeColors.warning.text` (warning çip) | `#c87000` → `#7a4400` | `#ffd59f` | 2.64 → **5.75:1** |
| `badgeColors.success.text` | `#339537` → `#1B5E20` | `#bce2be` | 2.69 → **5.53:1** |
| `paletteLight.successMain` (KPI live/active, Owned chip) | `#4CAF50` → `#1B7A3D` | `#ffffff` / `#f0f2f5` | 2.78 → **5.39 / 4.80:1** |
| “N more → Exceptions” `a11y.linkLight` | `info.main` | `#f0f2f5` | **5.46:1** |
| aynı, dark `a11y.linkDark` `#8EC8F8` | — | `#1a2035` / `#202940` | **9.04 / 8.10:1** |
| Vehicles plaka `text.main` (`navyFog700`) | `info.main` | `#ffffff` / `#f0f2f5` | **5.88 / 5.24:1** |
| Form hata `form.errorFg*` | yeni | white / dark panel | **6.57 / 7.07:1** |

axe Optimize / Exceptions+Resolve / Settings / Vehicles: **oturum yok** — login formu. Canlı axe Cem.

### 7.6 Doğrulama

| Kontrol | Sonuç |
|---|---|
| Hex grep kapsam | **0** |
| `npm run verify:i18n` | **521 keys** |
| `npm run build` | gzip **531.87 kB** `main.e84f45f0.js` (+1.28 kB), CSS 10.05 kB |
| Tasks 10× dil×tema | oturum yok; kod kanıtı §7.0 |
| Klavye Resolve | Esc / Ctrl+Enter kabukta; odak dönüşü MUI Dialog |
| Push | **Yok** (Cem) |

### 7.7 D5-fix-2 (merge öncesi)

Tek commit. Yeni paket yok.

1. **Exceptions ACTION.** `size="small"`, `text-transform: none`, `white-space: nowrap`, sütun `minWidth: 230` / `maxWidth: 280`. `< lg` ikon-only + `aria-label`; `≥ lg` Acknowledge / Resolve (1280 tam metin, 1045 ikon).
2. **StatusChip** kök `display: inline-flex; width: max-content`. DataTable `td > .MuiChip-root` aynı; hücre `align=left`. Tasks / Drivers / Vehicles aynı `StatusChip` / `PriorityChip`.
3. **Resolve Select.** `size="small"`; dialog içinde MUI small padding (`8.5px 14px`) + ikon görünür. Global `MuiSelect` `padding: 0` / `icon: none` dialog dışında durur. `InputLabel shrink` çakışması 0.
4. **`error.main`.** Light `#d32f2f` (beyaz **4.98:1**; sayfa `#f0f2f5` 4.44 — helper kart üzeri). Dark `#ff6b6b` (panel **5.81:1**, kart **5.21:1**). Pickup helper `error.main`; `form.errorFg*` aynı token’a alias. Eski `#ff8a80` / `#F44335` kalktı.
5. **Vehicles ikincil.** “More columns…” / “Showing…” `color="text"` → light `navyFog700` **5.88 / 5.24:1** (eski dark `secondary` `#7b809a` on `#202940` 3.71). Rented çip fg `#7a4400` on `#ffd59f` **5.75:1**; Leased `#074a9e` on `#aecef7` **5.23:1**.
6. **Optimize heading-order.** Sayfa `h2`; form / job / constraints kart `h3`; araç kolon başlığı `h4`. Görsel `variant="h6"` aynı.

axe Optimize + Vehicles + Exceptions dark/light serious 0: oturum yok (login). 1280 / 1045 ACTION ekran görüntüsü aynı nedenle rapora gömülmedi.

### 7.8 D5-fix-3

Tek commit. Yeni paket yok.

**ACTION 1045 hâlâ metin — kanıt.** `md` değildi. `useMediaQuery(theme.breakpoints.up("lg"))` kullanılıyordu. MD2 `breakpoints.ts`: `md=768`, **`lg=992`**, `xl=1200`. `up("lg")` = `min-width: 992px` → 1045’te `true` → etiket kalır. MUI varsayılan `lg=1200` bu temada yok. Düzeltme: `theme.breakpoints.down(1200)` (`iconOnly`). ≥1200 metinli buton `padding: 6px 10px`, `min-width: 0`, `overflow: hidden; text-overflow: ellipsis`.

**Resolve Select.** Kök: `MuiSelect.styleOverrides.select` `padding: 0 0.75rem !important` + `icon: display:none` (MD2, light+dark). Override kaldırıldı (padding + gizli ikon). Dialog `!important` yaması silindi. `size="small"` MUI varsayılan padding bırakır; label shrink + değer çakışmaz. Settings’te MuiSelect yok (FormField). Optimize’da MuiSelect yok (ToggleButtonGroup + flatpickr + chip). Tema değişikliği onları bozmaz.

**Yerel Chrome.** `/dispatcher/exceptions` login duvarı; `dispatcher-auth` `expiresAt=2026-09-22T14:01:48Z` (süresi dolmuş). 1045 / 1280 ACTION ve Resolve koordinat ekran görüntüsü bu oturumda alınamadı.

Push sonrası CNAME: Chrome’da yalnız 1045 (ikon) + 1280 (metin) Exceptions ACTION; Resolve label/değer çakışması 0.
