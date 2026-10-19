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

Kaynak repoda tespit edilen, ancak şimdilik dokunulmayan temizlenmemiş teslim artefaktları birebir taşındı: `__cargoScorer.ts.tmp`, `__feat020_spec.md.tmp`, `fix-feat020-phase12.js`, `fix-roadmap.js` (kökte). Bunlar Customer Edition'ın işleyişini etkilemiyor, temizlik Faz 3/4'te planlanabilir.

## Bağımsızlık durumu

**2026-10-18 (fork anında):** `src/config/api.ts`'deki `AUTH_API_URL` / `ENTERPRISE_API_URL` / `SUPERVISOR_API_URL`, üç ayrı backend varsayımıyla ana projenin domainlerine (`api.tulipfleet.com`, `enterprise-api.tulipfleet.com`) fallback yapıyordu.

**2026-10-18 (Faz 4, commit `98d6b51`) — düzeltildi:** Üçü tek bir `CEBI_API_URL`'e konsolide edildi (ayrı enterprise servisi yok — Faz 3 kararı), ana projeye fallback kaldırıldı. `REACT_APP_CEBI_API_URL` tanımsızsa açık hata loglanır, sessizce ana projeye bağlanmaz (ADR-CE-03). Gerçek değer henüz yok — sunucu `fleet-enterprise-01` olarak kararlaştırıldı, domain/subdomain adlandırması açık (bkz. `cebi-backend/FORK_BASELINE.md`).

**2026-10-19 — dağıtım platformu kararı kapandı (Cem):** cebi-dispatcher, Cloudflare Pages üzerinde DEĞİL, `fleet-enterprise-01`'in kendi Caddy'si üzerinden servis edilecek — ADR-CE-03'ün "tek sunucuda taşınabilirlik/tam izolasyon" ilkesinin doğrudan uygulanması (bkz. `cebi-backend/docs/adr/ADR-CE-03-bagimsiz-calisma-zamani.md` §2 madde 7, v2). Buna göre eklendi: `Dockerfile` (iki aşamalı — `node:20-alpine` CRA build + `caddy:2-alpine` statik servis), `docker/Caddyfile` (container-içi SPA fallback, host Caddy'siyle aynı katmanı tekrar etmez), `docker-compose.cebi-dispatcher.yml` (izole network, `cebi-backend`/`cebi-db` ile hiçbir ortak kaynak yok, `127.0.0.1:3101:80` — backend'in `3100` desenini takip eder), `.dockerignore`. `REACT_APP_CEBI_API_URL` artık `https://cebi-api.tulipfleet.com` olarak Dockerfile'da ARG varsayılanı — gizli değer olmadığı için (zaten tarayıcıda görünür) ayrı bir compose `.env` dosyası GEREKMİYOR (2026-10-19 cebi-db olayından çıkan ders kasıtlı olarak burada tekrar üretilmedi, bkz. `cebi-backend/SESSION_NOTE.md` "OLAY" notu).

**2026-10-19 (aynı gün) — TAMAMLANDI ve canlıda doğrulandı:** Domain `cebi-dispatcher.tulipfleet.com` olarak kesinleşti (Cloudflare A kaydı, Proxied + Origin Certificate, `cebi-api.tulipfleet.com` deseniyle aynı — `/etc/caddy/origin/cebi-dispatcher.{crt,key}`, host `/etc/caddy/Caddyfile`'ına site bloğu Cem tarafından elle eklendi, `caddy validate` + `systemctl reload caddy` temiz). **Bulunan ve düzeltilen hata:** ilk build denemesinde `npm ci` ERESOLVE ile başarısız oldu — `.npmrc` (`legacy-peer-deps=true`, react-scripts@5.0.1'in peer typescript aralığı ^3/^4 ile kök `typescript@5.0.4` arasındaki strict-mode çakışması için zaten repoda vardı) Dockerfile'da `npm ci`'den önce kopyalanmamıştı. Düzeltme: `COPY package*.json .npmrc ./` (commit `a3d79af`). `/opt/cebi-dispatcher`'a clone edilip `docker compose -f docker-compose.cebi-dispatcher.yml up -d --build` ile ayağa kalktı: `curl http://127.0.0.1:3101` → `200` (gerçek TulipFleet dispatcher paneli HTML'i), `curl https://cebi-dispatcher.tulipfleet.com` → `200`, Cloudflare üzerinden (`server: cloudflare`, `cf-ray` mevcut), güvenlik header'ları (`strict-transport-security`, `x-content-type-options: nosniff`, `x-frame-options: DENY`) doğru. Dağıtım platformu kararı artık sadece kayıtlı değil, fiilen uygulanmış ve doğrulanmış durumda. **Henüz yapılmadı:** gerçek backend bağlantısının (login/API çağrıları) tarayıcıdan uçtan uca denenmesi — şu ana kadar yalnızca statik dosya servisi doğrulandı.

## Değişiklik günlüğü

| Tarih | Not |
|---|---|
| 2026-10-18 | Fork oluşturuldu, baseline sabitlendi. |
| 2026-10-18 | Faz 4: üç-backend varsayımı tek `cebi-backend`'e konsolide edildi, ana proje fallback'leri kaldırıldı (commit `98d6b51`). |
| 2026-10-19 | Dağıtım platformu kapalı karar: Cloudflare Pages değil, `fleet-enterprise-01` Caddy'si (ADR-CE-03 v2 §2 madde 7). `Dockerfile` + `docker/Caddyfile` + `docker-compose.cebi-dispatcher.yml` + `.dockerignore` eklendi. Domain: `cebi-dispatcher.tulipfleet.com`. |
| 2026-10-19 | `.npmrc` kopyalanmadığı için `npm ci` ERESOLVE hatası (commit `a3d79af`, düzeltildi). `fleet-enterprise-01`'de DNS+Caddy+Docker ile canlıya alındı, `https://cebi-dispatcher.tulipfleet.com` → `200` doğrulandı (statik servis seviyesinde; backend entegrasyonu tarayıcıdan henüz denenmedi). |
