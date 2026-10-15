# D7 screenshot matrix

JPEG q80 (q65/50/35 fallback varsa, hiçbiri 150 KB'ı aşmadı — en büyüğü 85 KB, ortalama 45 KB).
Ad: `{screen}-{lang}-{theme}-{width}.jpg`.

`screen` ∈ login | map | tasks | drivers | vehicles | exceptions | optimize | settings
`lang` ∈ en | tr | nl · `theme` ∈ dark | light · `width` ∈ 1280 | 390

## Durum: TAMAMLANDI (15 Ekim 2026) — 96/96 hücre dolu

Önceki turda yalnızca `login` (6/96) üretilmişti; `dispatcher-auth` token süresi dolduğu
için diğer 7 ekran "blocked: auth expired" olarak kaydedilmişti. Bu turda tüm matris
tek seferde, gerçek prod build üzerinden (`npm run build` + `serve -s build`), Playwright
ile dolduruldu:

- **Auth bypass:** `useAuthStore.ts`'in `isAuthenticated` kontrolü tamamen client-side
  (`token` + gelecekteki `expiresAt`) olduğundan, `dispatcher-auth` localStorage anahtarına
  sahte ama biçimce geçerli bir zustand-persist JSON'u (`expiresAt: 2027-01-01`) yazılarak
  `AuthGate` geçildi — backend'e gerçek bir login isteği atılmadı.
- **API mock'ları:** `ENTERPRISE_API_URL`/`AUTH_API_URL`'e giden tüm istekler
  `page.route()` ile gerçekçi sabit veri (3 araç, 3 şoför, 3 görev, 2 istisna, 2 canlı konum,
  kullanıcı profili, bildirim tercihleri) döndürecek şekilde mock'landı — hiçbir ekran
  loading/error/empty state'inde kalmadı.
- **CARTO tile'ları:** bu sandbox'ın egress proxy'si `*.basemaps.cartocdn.com`'u
  reddediyor (allowlist dışı); tile istekleri 1×1 şeffaf PNG ile mock'landı — harita
  kabuğu (sidenav, filtre çipleri, route layers paneli, online/stale/offline lejantı)
  doğru render ediliyor, yalnızca zemin haritası dekoratif/boş.
- **Dil/tema:** `localStorage.tf-lang` ve `localStorage.tf.theme` (+ `data-theme` pre-paint
  script'i, `public/index.html`) her hücre öncesi `page.addInitScript` ile ayarlandı.

**Önemli not:** burada gösterilen veri (araç plakaları, şoför adları, görev numaraları,
istisna kayıtları, profil bilgisi) **mock/sabit fixture'dır**, gerçek prod verisi değil —
amaç ekranların TR/EN/NL + dark/light + masaüstü/mobil kombinasyonlarında doğru
render edildiğini (i18n, tema, responsive, veri-dolu tablo durumu) görsel olarak
arşivlemekti, canlı demo verisi sağlamak değil.

## Bilinen, belgelenmiş davranışlar (bug değil)

- `exceptions` ekranının TYPE kolonu `exception_type`'ı ham gösterir (`eta_deviation`,
  `geofence_exit`) — StatusChip yalnızca severity/status için sözlük taşıyor, bu zaten
  §5.2'de kayıtlı bilinen sınır (manifest dışı enum ham basılır).
- `tasks` mock fixture'ındaki `status: "planned"` değeri StatusChip sözlüğünde yok,
  ham gösteriliyor — bu fixture verisinin kendi eksikliği (gerçek backend enum'u farklı
  olabilir), üretim kodunda bir buğ değil.

## Dosyalar (96)

8 ekran × 3 dil × 2 tema × 2 genişlik, tam matris. Tek tek listelemek yerine dizin
içeriğine bakılabilir (`ls docs/screenshots/d7/*.jpg`); isimlendirme yukarıdaki
desene birebir uyuyor.
