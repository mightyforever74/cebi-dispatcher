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

1. `1bc1046` — `i18n: migrate modal, exception, emission and locale strings` (sözlük + kod + `verify-i18n`)
2. `2c11d73` — `fix(ui-d5): tokenise ConfirmDialogShell and wire three modals`
3. `3bfc58d` — `i18n: Optimize, Settings form copy and field validation`
4. Bu rapor

`git diff --stat 61fb58b...HEAD` (rapor commit’inden önce): 22 files, +1578 / −647. Rapor bu sayıya `docs/UI_D5_REPORT.md` ekler.
