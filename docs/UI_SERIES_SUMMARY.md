# TulipFleet Dispatcher — UI serisi özeti (D0 → D7)

**Kapanış branch:** `ui-d6-closeout` (`main` `424aef1`).
**Yeni özellik yok.** Hex yalnız `src/assets/theme/tokens.ts`. Push Cem.

---

## 1. Zaman çizelgesi

| Tur | Branch / merge | Ne kapandı |
|---|---|---|
| **D0** | keşif (`docs/UI_D0_DISCOVERY.md`) | Token sızıntısı, kırık dark mode, i18n delikleri, stale UI yok, ağır MD2 paketler, a11y boşlukları |
| **D1** | `ui-d1-theme` | `tokens.ts` tek kaynak, dark mode + FOUC, Space Grotesk/Manrope, reduced-motion/transparency altyapısı, tema hex 0 |
| **D2** | `ui-d2-shell` | Navbar 64px glass, sidenav/i18n, demo route temizliği, login landing dili, Settings gerçek formlar |
| **D3** | `ui-d3-livemap` | Harita 100dvh−64, CARTO dark/light, küme ≥20, bağlantı rozeti, klavye `/ F T Esc ?` |
| **D4** | `ui-d4-data` | `StatusChip`, `DataTable`, `DataState`, `Notifications` banner/toast |
| **D5** | `ui-d5-forms` → `424aef1` | i18n P2, `ConfirmDialogShell`, Optimize/Settings form, #185, ACTION 1200, Select padding |
| **D6** | `ui-d6-closeout` | `[]` tuzak, breakpoint token, paket diyeti, skip-link, glass/leaflet motion |
| **D7** | bu belge + `docs/screenshots/d7/` | Seri envanteri, metrik, arşiv (login matrisi; diğer ekranlar oturum yok) |

---

## 2. Tasarım prensipleri

### 2.1 Landing (7)

1. **Tek token kaynağı** — landing navy/fog/offwhite/emerald + ürün moru `tokens.ts` / `--tf-*`.
2. **Tipografi** — display Space Grotesk, body Manrope, sayılar `tabular-nums`.
3. **İki palet bilinçli** — landing accent `#ff5722` ile ürün `#7C3AED→#FB7A1E` birleştirilmedi (Cem).
4. **Cam** — `glass.blurPx` / opacity; `prefers-reduced-transparency` → 0 blur, opak 0.96.
5. **Odak** — global `:focus-visible` (`--tf-focus-ring`).
6. **Hareket** — `prefers-reduced-motion` MUI süre 0 + CSS güvenlik ağı.
7. **Tema kalıcılığı** — `data-theme` + `localStorage.tf.theme`, FOUC script.

### 2.2 Operasyonel dispatcher (11)

1. **Harita birincil** — Live map 100dvh−navbar; MQTT + REST stale-guard.
2. **Durum tek çip** — `StatusChip` ← `tokens.status.*` (task / alert / vehicle / exception).
3. **Tablo disiplini** — gerçek `<table>`, density 40/56, truncate, `<md` kart.
4. **Dört veri hali** — `DataState`: loading / empty+CTA / error+retry / stale.
5. **İkaz hiyerarşisi** — banner (critical/offline) vs toast (≤3, `×N`); ses yok.
6. **Onay kabuğu** — `ConfirmDialogShell`: Vazgeç sol, birincil sağ; danger iki adım; Esc/Enter.
7. **Sözlük** — typed flatten `en`/`tr`/`nl`; `verify:i18n`; glossary (taak/görev, ikaz/uyarı) P3.
8. **Üç backend** — `AUTH_API_URL` / `ENTERPRISE_API_URL` / `SUPERVISOR_API_URL` asla tek değişkende birleşmez.
9. **Yazma köprüsü** — dispatcher Server 1; tek write `public.tasks` INSERT.
10. **Boş referans** — hook `[]`/`{}` modül sabiti; `#185` setPageSize bail-out.
11. **Hex yasağı** — yeni hex yalnız `tokens.ts`; ekran/tema override hex 0 hedefi.

---

## 3. Mimari envanter

| Parça | Yol | Rol |
|---|---|---|
| `tokens.ts` | `src/assets/theme/tokens.ts` | Renk, status, glass, density, breakpoints, motion helpers |
| `StatusChip` | `src/components/StatusChip.tsx` | Operasyonel durum rengi + i18n etiket |
| `DataTable` | `src/components/DataTable` | Liste disiplini (react-table sarmalayıcı) |
| `DataState` | `src/components/DataState` | loading / empty / error / stale |
| `Notifications` | `src/components/Notifications` | Banner + toast + `useNotifications` |
| `ConfirmDialogShell` | `src/components/ConfirmDialogShell` | Modal standardı |
| `empty.ts` | `src/utils/empty.ts` | `EMPTY_ARRAY` / `EMPTY_OBJECT` |
| `api.ts` | `src/config/api.ts` | Üç backend URL (korumalı) |

---

## 4. Metrik tablosu (D0 → D7)

| Metrik | D0 | D7 (D6 ölçümü) |
|---|---|---|
| Tema katmanı hex | 159 (dağınık colors.ts) | **0** (`theme/components`); literal yalnız `tokens.ts` |
| Ekran hex (map/modal) | D0: LiveFleetMap 26, Shell 15 | D3–D5 token’landı; kural: yeni hex yok |
| i18n | Exceptions + 3 modal hardcoded TR | **522** key, EN/TR/NL union |
| Dark mode | Kırık (`themeDark` sabit) | Context + `tf.theme` + FOUC |
| JS gzip | ölçülemedi (build yok) | **531.97 kB** (1 chunk) |
| CSS gzip | — | **10.05 kB** |
| Bundle diyeti | FullCalendar, jvectormap, chart, draft-js kurulu | **silindi**; gzip Δ **0%** (zaten tree-shake) |
| `react-hooks/exhaustive-deps` | bilinmiyor | **0** (error kuralı) |
| Lighthouse a11y (8 ekran) | ölçülemedi | Login dışında **oturum yok**; LH paketi eklenmedi |
| axe critical/serious | ölçülemedi | Login **0 / 0** (`violations: []`); 7 ekran ölçülemadi |
| Skip-link | yok | `common.skipToMain` → `#main-content` |

D1 JS ~486.87 kB, D2 484.46 kB, D5 531.87 kB — D3–D5 harita/form/i18n ekledi. D6 paket silme **uygulama grafiğini değiştirmedi**.

---

## 5. Backend / gelecek

1. **i18n toast/banner şablonları** — kuyruk `titleKey` ile; kalan düz metin P3.
2. **Manifest dışı `rule_violation`** — StatusChip bilinmeyeni ham gösterir; sözleşme netleşince enum.
3. **Cloudflare Preview MQTT env** — preview’da MQTT yoksa rozet `polling` (bilinçli); CNAME env Cem.
4. **CARTO Referer** — basemap anahtarı URL’de; referer kısıtı infra.
5. **P3 terimler sözlüğü** — taak/görev, ikaz/uyarı donduruldu; P3’te tek dil kararı.
6. **Oturumlu D7 arşivi** — 8 ekran × TR/EN/NL × dark/light × 1280/390; bu turda token süresi dolmuş.
7. **≥%10 gzip** — code-split veya MD2/MUI yüzey küçültme (ayrı karar).

---

## 6. D7 görsel arşiv

Dizin: `docs/screenshots/d7/`. JPEG q80, hedef ≤150 KB.

Ad: `{screen}-{lang}-{theme}-{width}.jpg`  
`screen` ∈ login | map | tasks | drivers | vehicles | exceptions | optimize | settings  
`lang` ∈ en | tr | nl · `theme` ∈ dark | light · `width` ∈ 1280 | 390

Bu turda üretilenler: **login** (oturum gerekmez). Diğer 7 ekran `README.md` içinde “blocked: auth expired”.
