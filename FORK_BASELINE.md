# FORK_BASELINE.md — cebi-dispatcher

Bu dosya, `cebi-dispatcher` reposunun "doğum sertifikası"dır. Fork anındaki durumu sabitler; ilerleyen fazlarda değiştirilmez, sadece altına tarihli not eklenir.

| Alan | Değer |
|---|---|
| **Proje** | TulipFleet Customer Edition — Dispatcher Panel (kapalı-devre kurumsal operasyon paneli) |
| **Fork tarihi** | 2026-10-18 |
| **Kaynak repo** | https://github.com/mightyforever74/tulipfleet-dispatcher |
| **Baseline branch** | `main` (kaynak `origin/main`) |
| **Baseline commit SHA** | `723f3a21f74d1935323b2b82ba75b73d379b0b5d` |
| **Baseline commit mesajı** | "feat(theme): dark-mode page chrome (body/sidenav/card) → landing navy ladder" |
| **Fork senaryosu** | Senaryo A — doğrudan `origin/main`'den |
| **Doğrulama** | Fork anında `git fetch origin main` ile drift kontrolü yapıldı: local HEAD ile `origin/main` birebir eşleşti. Push sonrası `git ls-remote origin main` ile aynı SHA doğrulandı. |
| **Kardeş repolar** | `cebi-backend` ← `tulipfleet-backend` @ `23bfa4e7252daac0bbc70a546384a8ccf5b275b1` · `cebi-mobile` ← `tulipfleet` @ `b51570a8e85ba57ab9425f09c6cf222ed68699fd` |
| **Merkezi ADR'ler** | `cebi-backend` reposunda, `/docs/adr/ADR-CE-01…04` |
| **Faz 1 raporu** | Proje dokümanı: `claude/tulipfleet-customer-edition-faz1-kesif-raporu.md` |

## Devralınan teknik borç (fork anında — henüz temizlenmedi)

**TEMİZLENDİ (2026-10-19):** kaynak repodan fork ile taşınan teslim artefaktları (`__cargoScorer.ts.tmp`, `__cargoScorer.test.ts.tmp`, `__feat020_spec.md.tmp`, `__roadmap_w24.txt.tmp`, `fix-feat020-phase12.js`, `fix-roadmap.js`, kökte) silindi. Doğrulama: gerçek karşılıkları (`src/services/dispatch/scoring/scorers/cargoScorer.ts`/`.test.ts`, `docs/functions/FEAT-020-...md`, `docs/ROADMAP.md`) zaten mevcuttu ve bu dosyalara hiçbir kod/konfig referans vermiyordu (repo genelinde grep ile doğrulandı) — silinenler sadece bir kerelik, önceden uygulanmış teslim scriptlerinin tamamlanmış yan ürünleriydi.

## Bağımsızlık durumu

**2026-10-18 (fork anında):** `src/config/api.ts`'deki `AUTH_API_URL` / `ENTERPRISE_API_URL` / `SUPERVISOR_API_URL`, üç ayrı backend varsayımıyla ana projenin domainlerine (`api.tulipfleet.com`, `enterprise-api.tulipfleet.com`) fallback yapıyordu.

**2026-10-18 (Faz 4, commit `98d6b51`) — düzeltildi:** Üçü tek bir `CEBI_API_URL`'e konsolide edildi (ayrı enterprise servisi yok — Faz 3 kararı), ana projeye fallback kaldırıldı. `REACT_APP_CEBI_API_URL` tanımsızsa açık hata loglanır, sessizce ana projeye bağlanmaz (ADR-CE-03). Gerçek değer henüz yok — sunucu `fleet-enterprise-01` olarak kararlaştırıldı, domain/subdomain adlandırması açık (bkz. `cebi-backend/FORK_BASELINE.md`).

**2026-10-19 — dağıtım platformu kararı kapandı (Cem):** cebi-dispatcher, Cloudflare Pages üzerinde DEĞİL, `fleet-enterprise-01`'in kendi Caddy'si üzerinden servis edilecek — ADR-CE-03'ün "tek sunucuda taşınabilirlik/tam izolasyon" ilkesinin doğrudan uygulanması (bkz. `cebi-backend/docs/adr/ADR-CE-03-bagimsiz-calisma-zamani.md` §2 madde 7, v2). Buna göre eklendi: `Dockerfile` (iki aşamalı — `node:20-alpine` CRA build + `caddy:2-alpine` statik servis), `docker/Caddyfile` (container-içi SPA fallback, host Caddy'siyle aynı katmanı tekrar etmez), `docker-compose.cebi-dispatcher.yml` (izole network, `cebi-backend`/`cebi-db` ile hiçbir ortak kaynak yok, `127.0.0.1:3101:80` — backend'in `3100` desenini takip eder), `.dockerignore`. `REACT_APP_CEBI_API_URL` artık `https://cebi-api.tulipfleet.com` olarak Dockerfile'da ARG varsayılanı — gizli değer olmadığı için (zaten tarayıcıda görünür) ayrı bir compose `.env` dosyası GEREKMİYOR (2026-10-19 cebi-db olayından çıkan ders kasıtlı olarak burada tekrar üretilmedi, bkz. `cebi-backend/SESSION_NOTE.md` "OLAY" notu).

**2026-10-19 (aynı gün) — TAMAMLANDI ve canlıda doğrulandı:** Domain `cebi-dispatcher.tulipfleet.com` olarak kesinleşti (Cloudflare A kaydı, Proxied + Origin Certificate, `cebi-api.tulipfleet.com` deseniyle aynı — `/etc/caddy/origin/cebi-dispatcher.{crt,key}`, host `/etc/caddy/Caddyfile`'ına site bloğu Cem tarafından elle eklendi, `caddy validate` + `systemctl reload caddy` temiz). **Bulunan ve düzeltilen hata:** ilk build denemesinde `npm ci` ERESOLVE ile başarısız oldu — `.npmrc` (`legacy-peer-deps=true`, react-scripts@5.0.1'in peer typescript aralığı ^3/^4 ile kök `typescript@5.0.4` arasındaki strict-mode çakışması için zaten repoda vardı) Dockerfile'da `npm ci`'den önce kopyalanmamıştı. Düzeltme: `COPY package*.json .npmrc ./` (commit `a3d79af`). `/opt/cebi-dispatcher`'a clone edilip `docker compose -f docker-compose.cebi-dispatcher.yml up -d --build` ile ayağa kalktı: `curl http://127.0.0.1:3101` → `200` (gerçek TulipFleet dispatcher paneli HTML'i), `curl https://cebi-dispatcher.tulipfleet.com` → `200`, Cloudflare üzerinden (`server: cloudflare`, `cf-ray` mevcut), güvenlik header'ları (`strict-transport-security`, `x-content-type-options: nosniff`, `x-frame-options: DENY`) doğru. Dağıtım platformu kararı artık sadece kayıtlı değil, fiilen uygulanmış ve doğrulanmış durumda.

**2026-10-19 (aynı gün, devam) — backend entegrasyonu da uçtan uca doğrulandı:** `cebi-dispatcher.tulipfleet.com` Origin'inden gerçek `Origin` header'ıyla `cebi-api.tulipfleet.com`'a istek atılarak (bir tarayıcının CORS+JWT davranışı birebir taklit edilerek) doğrulandı: CORS (`access-control-allow-origin: *`, JWT `Authorization` header'ında olduğu için sorun değil), `POST /api/auth/login` → `200` + JWT, JWT ile `GET /api/dispatcher/drivers`/`vehicles`/`locations/latest`/`tasks` → hepsi `200` + gerçek veri, token'sız istek → `401`. Yol boyunca `cebi-backend`'de bağımsız bir hata bulundu/düzeltildi (`hash_pw.js` git'te değildi, bkz. `cebi-backend/SESSION_NOTE.md` "devam 16") — `cebi-dispatcher`'ın kendi kodunu/config'ini etkilemiyor.

## Değişiklik günlüğü

| Tarih | Not |
|---|---|
| 2026-10-18 | Fork oluşturuldu, baseline sabitlendi. |
| 2026-10-18 | Faz 4: üç-backend varsayımı tek `cebi-backend`'e konsolide edildi, ana proje fallback'leri kaldırıldı (commit `98d6b51`). |
| 2026-10-19 | Dağıtım platformu kapalı karar: Cloudflare Pages değil, `fleet-enterprise-01` Caddy'si (ADR-CE-03 v2 §2 madde 7). `Dockerfile` + `docker/Caddyfile` + `docker-compose.cebi-dispatcher.yml` + `.dockerignore` eklendi. Domain: `cebi-dispatcher.tulipfleet.com`. |
| 2026-10-19 | `.npmrc` kopyalanmadığı için `npm ci` ERESOLVE hatası (commit `a3d79af`, düzeltildi). `fleet-enterprise-01`'de DNS+Caddy+Docker ile canlıya alındı, `https://cebi-dispatcher.tulipfleet.com` → `200` doğrulandı (statik servis seviyesinde). |
| 2026-10-19 | Backend entegrasyonu (CORS+JWT login+`/api/dispatcher/*`) `cebi-dispatcher.tulipfleet.com` Origin'inden uçtan uca doğrulandı, hepsi `200`/gerçek veri, token'sız `401`. Detay: `cebi-backend/SESSION_NOTE.md` "devam 16". |
| 2026-10-19 | Fork mirası bağlayıcılık ibaresi eklendi: `docs/ROADMAP.md` (41 dosyalık devralınan enterprise ağacının girişi) başına, bu klasörün ana projenin gerçekliğini anlattığı ve Cebi için bağlayıcı olmadığı notu eklendi (ADR-0001..0014/ROADMAP.md için otorite hâlâ bu dosya). Yeni dosya açılmadı. Detay: `cebi-backend/SESSION_NOTE.md` "devam 18", Faz 1 raporu Risk #15. |
| 2026-10-21 | Panel ilk kez Cem tarafından gerçek tarayıcıdan canlı test edildi — `requireRole`'ün `dispatcher` rolünü kasıtlı dışarıda bırakması yüzünden sistemik 403 görüldü (dispatcher kodu DEĞİL, backend/rol ataması sorunuydu). Detay: `cebi-backend/SESSION_NOTE.md`. Aynı turda: sign-in ekranının varsayılan e-posta alanı `demo@tulipfleet.com` → `info@tulipfleet.com` (commit `501668b`) — rebrand kapsam dışı, sadece bu alan Cem'in isteğiyle değişti. |
| 2026-10-21 | Live Fleet Tracking araç detay paneli yeniden tasarlandı (Cem geri bildirimi: harita üzerinde yüzen panel haritanın önemli bir kısmını kaplıyordu). Önce genişlik küçültüldü (280→220px, commit `d9eb92a`), yetmedi — panel tamamen kaldırılıp seçili aracın sol listedeki kartı kendi içinde genişleyecek şekilde yeniden yapıldı (`Route layers` panelindeki davranışla tutarlı), `VehicleDetailPanel.tsx` silindi (commit `34649d2`). İlk denemede dış `ListItem`'in varsayılan flex (row) düzeni yüzünden yeni blok yana açılmıştı, metinler sıkışmıştı; `display:"block"` ile düzeltildi, atlanan Stale/Stopped durum rozetleri geri eklendi (commit `ca62012`). |
