# UI D7-1 — Fontlar self-host (Google Fonts kaldırıldı)

Dal: `ui-d7-fonts` · Taban: main `843393c` · Tarih: 2026-09-26 · Uygulayan: Claude (Cowork), commit: Cem

## Neden
Prod Lighthouse (Desktop, gizli pencere, 843393c): Live map 74 / Tasks 89 / Exceptions 79.
Üç ekranda ortak kök neden: `fonts.googleapis.com/css2` + `/css` render-blocking, ardından
`fonts.gstatic.com` woff2 zinciri — kritik yol **1.870 ms**; font swap → CLS 0.101–0.203.
İkon fontu (Material Icons Round) tek başına 170 KiB ve index.html beş varyant istiyordu;
kod yalnızca `material-icons-round` kullanıyor (`assets/theme*/components/icon.ts`).

## Değişiklik (dokunulan dosyalar)
| Dosya | Ne |
|---|---|
| `public/index.html` | 4 Google Fonts satırı kaldırıldı (2 preconnect + 2 stylesheet); 3 `<link rel=preload as=font crossorigin>` eklendi (Manrope latin, Space Grotesk latin, Material Icons Round) |
| `public/fonts/*.woff2` (5) | `@fontsource-variable/space-grotesk` + `manrope` (latin, latin-ext; variable 300–700), `@fontsource/material-icons-round` (v5.3.0) |
| `public/_headers` | `/fonts/*` → `Cache-Control: public, max-age=31536000, immutable` |
| `public/index.html` (inline `<style>`) | 5 `@font-face` (aile adları typography.ts ile birebir: "Space Grotesk", "Manrope"; ikon `font-display: block`, metin `swap`; latin-ext `unicode-range`) + `.material-icons`/`.material-icons-round` sınıfı (Google CSS'inin sağladığı kurallar) |

package.json'a bağımlılık **eklenmedi**: dosyalar repo'da, build zinciri npm'e bağlı değil.
Lisans: Space Grotesk / Manrope SIL OFL 1.1, Material Icons Apache-2.0 (self-host serbest).

Not: `@font-face` önce `src/assets/css/fonts.css` olarak denendi; CRA css-loader `url(/fonts/..)`'u modül
olarak çözmeye çalışıp build'i kırdı (`Can't resolve '/fonts/...'`). public/ dosyalarına CSS'ten
referans için tek güvenli yer HTML inline `<style>` — ek istek de yok.

## Beklenen etki
Kritik yolda üçüncü taraf istek 0; fontlar HTML ile paralel (preload) ve aynı origin.
Türkçe karakterler latin-ext alt kümesinden gelir (ğ ş İ ı ç ö ü) — TR ekranlarında
glyph kaybı olmamalı; kontrol maddesi aşağıda.

## Doğrulama (2026-09-26, preview host dispatcher-preview.tulipfleet.com → CNAME ui-d7-fonts, commit 658f600)
- [x] `npm run build` temiz; `build/index.html` içinde `googleapis` 0, `font-face` 1 (minify)
- [x] Network (yan panel): googleapis/gstatic 0; 5 woff2 aynı origin, `cache-control: public, max-age=31536000, immutable`, CF MISS→HIT; konsol hatasız
- [x] TR Tasks/Drivers: ğ Ş İ ı ç Ç ö Ö ü Ü Manrope ile çiziliyor, `document.fonts.check` true; latin-ext dosyası yükleniyor
- [x] 29 ikon `Material Icons Round`; sıfırdan yüklemede ligatür metni 0 (font-display: block + preload)
- [x] Lighthouse Desktop (Brave gizli, Shields kapalı): Live map preview'da, Tasks/Exceptions prod 3aebb4b'de ölçüldü
- [ ] axe Login/Live map/Tasks × dark/light: crit/ser 0 — merge sonrası prod turunda

| Ekran | Perf önce → sonra | LCP | CLS |
|---|---|---|---|
| Live map | 74 → **87** | 2.3 s → **1.9 s** | 0.203 → **0.078** |  (TBT 100 → 60 ms, SI 1.8 → 1.3 s, A11y 100)
| Tasks (prod 3aebb4b) | 89 → **93** | 1.2 s → **1.4 s** | 0.101 → **0.056** |  (FCP 1.0 s, TBT 40 ms, SI 1.3 s)
| Exceptions (prod 3aebb4b) | 79 → **89** | 1.4 s → **1.1 s** | 0.129 → **0.168 (kötü)** |  (FCP 0.9 s, TBT 30 ms, SI 1.1 s) — font dışı: boş-durum→veri değişimi + tablo başlık/gövde; D7-2 #1

Insights (sonra): "Font display" ve Google Fonts zinciri kalmadı; render-blocking yalnızca main.css (turuncu).
Kalan kırmızılar: görsel 207 KiB (logo PNG + cartocdn tile), LCP öğesi harita tile'ı, legacy JS 8 KiB.

## D7-1 sırasında bulunan, D7-1'den BAĞIMSIZ (prod'da birebir aynı) üç kusur → D7-2
1. DataTable başlık/gövde genişlik uyumsuzluğu: Tasks başlık 730 px / gövde 934 px, Drivers 650 / 949; sütun sol kenarları tutmuyor.
2. Drivers ilk yüklemede ~200 ms "Sürücü yok" boş-durumu, veri 370–550 ms'de geliyor → DataState `isLoading` ile boş-durum ayrımı.
3. Sidenav yatay scrollbar: Paper 235 px, içerik 251 px (TR uzun etiket "Akıllı Rota Optimizas…", overflow-x: auto).

## Notlar / sonraki adım
- İkon fontu 170 KiB'nin tamamı; kullanılan ligatürlerle alt küme (pyftsubset) D7-2 adayı.
- Logo `img` intrinsic boyut (CLS kalanı) D7-2.
