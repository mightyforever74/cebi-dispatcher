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

## Doğrulama (doldurulacak)
- [ ] `npm run build` temiz; `build/index.html` içinde `googleapis` geçmiyor
- [ ] Preview alias'ta Network: `fonts.googleapis`/`gstatic` isteği 0; `/fonts/*.woff2` 200, `cache-control: immutable`
- [ ] TR dilinde Tasks/Drivers: ğ ş İ ı ç ö ü doğru glyph (fallback Arial değil) — ekran görüntüsü
- [ ] İkonlar (sidenav, tablo aksiyonları, StatusChip) Round varyantında, ligatür metni görünmüyor
- [ ] Lighthouse Desktop (gizli, Shields kapalı) Live map / Tasks / Exceptions: Perf, LCP, CLS — önce/sonra tablosu
- [ ] axe Login/Live map/Tasks × dark/light: crit/ser 0 korunuyor

| Ekran | Perf önce → sonra | LCP | CLS |
|---|---|---|---|
| Live map | 74 → | 2.3 s → | 0.203 → |
| Tasks | 89 → | 1.2 s → | 0.101 → |
| Exceptions | 79 → | 1.4 s → | 0.129 → |

## Notlar / sonraki adım
- İkon fontu 170 KiB'nin tamamı; kullanılan ligatürlerle alt küme (pyftsubset) D7-2 adayı.
- Logo `img` intrinsic boyut (CLS kalanı) D7-2.
